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
