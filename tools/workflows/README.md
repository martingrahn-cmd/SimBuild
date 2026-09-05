# Orchestration scripts

Workflow-tool scripts, versioned here so the orchestration is reviewable like the rest of the project.
They are not runnable with `node`; they are passed to the Workflow tool as `scriptPath`.

| Script | Purpose |
|---|---|
| `wave.js` | The wave runner: builder → critic loop per module, then the integrator. Prompts are thin; everything invariant lives in `docs/prompts/`. |

## Running a wave

```js
Workflow({ scriptPath: 'tools/workflows/wave.js', args: {
  wave: 2, integrate: true, roundsPerRun: 2,
  modules: [{ name: 'buildings', phase: 'build', round: 1 }],
  notes: 'cross-cutting observations the orchestrator wants every builder in this wave to act on',
}})
```

`modules[].phase` and `.round` come from `docs/STATUS.json` → `modules[].next`, which `node tools/status.mjs`
derives from `docs/builds/` and `docs/critic/`. That is what makes a run killed by a usage limit cost one round
rather than the project: re-launch with the new `next` values and it resumes at the right phase.

`roundsPerRun` caps how many build→critic rounds a single module may consume in one launch (default 2). On a
4-CPU box the Workflow tool runs only 2 agents concurrently, so without the cap one module can eat an entire
usage window while twelve others sit at round 0.
