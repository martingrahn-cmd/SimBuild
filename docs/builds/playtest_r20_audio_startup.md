# R20 deferred audio startup

## Scope

R20 removes procedural ambient/world sound synthesis from the menu-critical startup path. The twelve interface sounds still render synchronously so the first user gesture can produce feedback. The remaining eleven sounds render in yielded tasks after `app:ready`, or synchronously before the dedicated Audio showcase is staged. A live mixer accepts each completed buffer and starts each ambient loop once; the existing catalogue, synthesis inputs, mix rules, settings and user-gesture gate are unchanged.

The deferred job carries a lifecycle epoch. Disposing or reinitializing Audio invalidates an in-flight job, preventing late buffers or logs from leaking into a later module instance.

## Verification

- `SIM_URL=http://127.0.0.1:5181 node tools/audio-deferred-startup-probe.mjs`: PASS on the production build with zero page/console errors.
- Audio module initialization: 21ms in the final run, versus roughly 289–307ms in the R11/R19 production attribution.
- Main menu ready at 3,240ms; the complete 23-sound catalogue was ready at 3,430ms. Terrain remains the dominant and variable startup owner, so this round does not claim the full cold-start gate is closed.
- All browser-generated names and channel bytes hash to `e81aaf8e2fa94c527015db03e5ad552c700cf85326db29844ea75e3d26e3fc5d`, exactly matching the synchronous pre-R20 browser reference.
- A real Playwright mouse gesture starts the AudioContext, `ui_click` plays successfully, and audio settings serialize/deserialize exactly.
- The Audio showcase waits for all 23 sounds and mounts its real `.au-panel` before passing.
- `npm run build`: PASS, Vite 8.2.2, 164 modules. The repository's file-provider output cleanup made this invocation abnormally slow; module transformation and the resulting artifact completed successfully.
- `node src/modules/simulation/selftest.mjs 90 1337`: deterministic repeat and exact save/load PASS.

## Decision

Accept the owner-local startup deferral. It removes about 92–94% of Audio's critical initialization time while preserving the exact sound catalogue and first-interaction contract. Keep the overall loading issue open because total readiness is still dominated by Terrain and varies around the previous range.
