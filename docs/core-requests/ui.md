# ui — core / tools requests

Nothing blocking; the module runs on the current core. Three nits hit while verifying:

1. **`engine.stats.fps` is misleading under slow rendering.** It divides frames by the *clamped* dt (≤ 0.1 s),
   so a page rendering one frame every 5 s reports "10 fps". Suggest accumulating wall-clock time
   (`performance.now()` deltas) for the fps stat only. The ui dev corner now measures its own wall-clock fps.
2. **`tools/screenshot.mjs`: `page.screenshot` timeout (30 s) is tight on SwiftShader.** Views with a lot of
   shadowed, textured fill (e.g. `closeup`) take 12–30 s per frame on the loaded box; a 90 s screenshot
   timeout (or reusing `--timeout`) would avoid spurious FAILs. Also, a **Vite full reload** triggered by another
   builder saving a file during a run kills the shot with "Execution context was destroyed" — a single retry of
   the shot on that specific error would make gauntlet runs robust on the shared dev server.
3. **`BUDGET.perModuleDrawCalls.ui = 5`** — in-game the UI is DOM (0 draw calls); the ui showcase backdrop scene
   uses 4 draws + shadow passes (11 total with environment). The module declares `budget.drawCalls: 16` for the
   showcase; the in-game number is 0.
