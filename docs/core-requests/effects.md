# Core requests — effects

## 1. `tools/screenshot.mjs`: raise the Playwright screenshot timeout (blocking)

`page.screenshot({ path, type: 'png' })` uses Playwright's default 30 s timeout. Under SwiftShader a full
1080p frame of a lit city (CSM + IBL + fog materials, plus the post chain) takes 3–6 s, and while another
builder's gauntlet runs on the same 4-core box it is 6–10 s. Chromium queues several frames before the
capture, so the capture regularly exceeds 30 s and the tool reports
`page.screenshot: Timeout 30000ms exceeded` with an otherwise healthy page (no console errors).

Suggested change (one line):

```js
await page.screenshot({ path: out, type: 'png', timeout: 180000 });
```

and in the `catch` fallback the same. Optionally honour `--timeout` there too.

Workaround used by effects during development: a private Playwright script with a 240 s screenshot
timeout (`scratchpad/profile.mjs`) — the rendered output is identical to the tool's, but it does not
produce the tool's JSON, so the official gauntlet had to be run in low-load windows.

## 2. (nice to have) `engine.setComposer` — pass the logical size too

`Engine.setSize` hands the composer `w * pixelRatio, h * pixelRatio`; EffectComposer.setSize multiplies
by its own pixel ratio again. effects works around it with `composer.setPixelRatio(1)`. Documenting the
contract ("composer.setSize receives physical pixels") in ARCHITECTURE §6 would avoid the trap for others.

## 3. (nice to have) headless GPU sync hook

In headless mode effects issues a 1×1 `readPixels` after the composer render so the GPU queue never
runs more than one (multi-second) frame ahead — this keeps screenshot capture latency ≈ one frame.
If the engine did this centrally for `headless` (after `renderer.render`/composer), every module's
screenshots would benefit, not just the ones with the post chain installed.

## 4. `src/main.js`: in showcase mode, import only the wanted modules (blocking for clean JSON)

`loadModuleDefs()` dynamically imports every module folder before `selectModules()` runs. While another
builder is mid-edit (e.g. `simulation/index.js` importing a file that does not exist yet), Vite returns a
500 for that module and main logs `[main] module simulation failed to import …` — which lands in the
`errors[]` of *every other module's* screenshot JSON, so an effects gauntlet can show 3–4 console errors
that have nothing to do with effects. Suggested: parse the URL first and only import
`selectModules(showcase)` (the wanted set); or, at minimum, keep import failures of modules that are not in
the wanted set out of `window.__sim.errors` (log them as warnings).

## 5. Vite full reloads while a screenshot is in flight

Every save in any `src/modules/**` file triggers a full page reload in the headless browser (no HMR accept
handlers), so a screenshot whose page is mid-render when another builder saves captures the `#boot`
"LOADING" overlay with `ok: true` (the tool saw `ready` before the reload). Harmless when builders work
alone; with four builders on one box it corrupts ~1 in 6 shots. Two cheap fixes: `tools/screenshot.mjs`
could check `document.getElementById('boot').classList.contains('hidden')` right before capture and
re-wait for `ready` if the page navigated; or the dev server could run with `server.hmr = false` for the
gauntlet URL (`?headless=1`) so reloads never hit tool-driven pages.

## 6. `tools/gauntlet.mjs`: forward `--timeout` to `screenshot.mjs`

Under a load average of 8+ (two builders shooting, SwiftShader threads) a single 1080p frame of the effects
showcase takes 8–10 s and `ready` (5 frames + asset settle) arrives after 60–120 s, so the gauntlet's fixed
90 s tool timeout fails most shots (`page.waitForFunction: Timeout 90000ms exceeded`). `screenshot.mjs`
already honours `--timeout`; the gauntlet just needs to pass it through (default 90, builders use 300).
Workaround used for the effects dev gauntlet: a private wrapper that invokes `tools/screenshot.mjs` with
`--timeout 300` for the same 16-shot matrix and writes the same `summary.json` shape.
