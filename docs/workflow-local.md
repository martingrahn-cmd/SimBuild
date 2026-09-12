# Local wave runner

`tools/workflows/wave.js` remains the builder → independent critic → integrator state machine. In a session without the original Workflow tool, `local.mjs` runs that script with a file-backed agent bridge; it does not generate a verdict or score itself.

For this machine, port 5173 belongs to another project. SimBuild uses 5174:

```sh
export SIM_PORT=5174
export SIM_URL=http://127.0.0.1:5174
export SIM_GL=metal
export SIMBUILD_REF="$HOME/.simbuild/ref"
./tools/devserver.sh
node tools/workflows/local.mjs --wave 2 --queue shots/workflows/w2-run2
```

In an exec environment that reaps detached children, keep `npx vite --host 127.0.0.1 --port 5174 --strictPort` in a persistent terminal session. Do not stop another project's server to reclaim its port.

The runner recomputes `docs/STATUS.json`, reads matching modules' `next` phases, and emits `*.request.json` files. The coordinating agent dispatches each request to an agent that follows its role/spec, then that worker writes the schema-conforming `*.result.json` at the request's `result` path only after its evidence/report is complete. Never assign a module's critic round to that module's builder. Run at most three workers concurrently in this session. All screenshot/probe commands inherit the same SIM_URL and Metal backend.

Use a fresh queue directory on each invocation; previous requests/results are audit evidence. The run ends at the existing 8.5 gate or four-round cap. An exhausted module is still a failure, not a pass. After wave 2, run 2b, then 3, then the whole-game critic and blind judges from their role files. Blind judges receive a fresh context, the judge role text, and only the normalized image directory; the answer key stays outside it.

Screenshot capture now selects an installed Chrome if the Playwright cache is absent; JSON evidence records its executable and browser version. For custom probes on this Mac, pass `executablePath: process.env.SIM_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'` to `chromium.launch`, or export `SIM_CHROME` and read it in the probe. This launches an isolated automation profile, not the user's browser session. Metal fallback smoke: `shots/integration/w2_chrome_smoke.png/json`, ready with zero errors.

After repeated internal-disk ENOSPC failures, verification uses the connected external disk at
`/Volumes/ExtDrive/SimBuild-verification-2026-09-06`. Selected `shots/` round directories are symlinks
there, preserving the paths in reports. Keep that disk connected. Completed tools r3/r3_presets and
new zoning/buildings/traffic round evidence were moved without discarding images. New round directories
should also live there. Export `TMPDIR=/Volumes/ExtDrive/simbuild-tmp` for browser temporary profiles;
Chrome still requires some free internal disk space for macOS sockets/shared memory.

The previous bundled Python runtime disappeared. Image analysis now runs with system `python3` and
`PYTHONPATH=/Volumes/ExtDrive/SimBuild-verification-2026-09-06/python-deps` (Pillow11.3, NumPy2.0.2).
The external evidence root has a `node_modules` symlink to this project's dependencies for probe imports.
Only regenerable npm cache and the generated `dist/` build output were removed during recovery;
rebuild `dist/` during the final integration check.

### Resuming after a process or power interruption

Keep the existing queue and use `node tools/workflows/local.mjs --wave 2b --queue shots/workflows/w2b --resume true` with the same runtime environment. Resume reloads the original `run.json` arguments and matches requests by their unique phase/module/round label. Completed result files are replayed; pending request files retain their original IDs; new requests continue after the highest existing ID. Never run two coordinators against the same queue.

If this host reaps a background Vite process when the launcher shell exits, keep `npx vite --host 127.0.0.1 --port 5174 --strictPort` running in a persistent terminal session. Verify the URL again from a separate shell before resuming captures. A refused connection during recovery is an infrastructure interruption, not a game console error or a completed capture.
