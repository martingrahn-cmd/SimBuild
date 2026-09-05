/**
 * SimBuild wave runner — a Workflow tool script (not runnable with node; passed as scriptPath to the Workflow tool).
 *
 *   Workflow({ scriptPath: 'tools/workflows/wave.js', args: {
 *     wave: 2, integrate: true, roundsPerRun: 2,
 *     modules: [{ name: 'buildings', phase: 'build', round: 1 }, ...],
 *     notes: 'cross-cutting observations for this wave'
 *   }})
 *
 * The prompts it generates are deliberately THIN. Everything invariant lives in docs/prompts/:
 * BUILDER.md, CRITIC.md, INTEGRATOR.md and modules/<name>.md. If you find yourself adding instructions
 * here, they belong in one of those files instead — see docs/prompts/README.md.
 *
 * Resumable: each module's next phase and round come from docs/STATUS.json (`modules[].next`), which
 * tools/status.mjs derives from docs/builds/ and docs/critic/. A run killed by a usage limit costs at
 * most the round it was in.
 */
export const meta = {
  name: 'simbuild-wave',
  description: 'SimBuild wave runner: builder -> critic gauntlet loop per module against the prompt library, then integrator',
  phases: [
    { title: 'Build', detail: 'one builder per module, owns only its folder' },
    { title: 'Critic', detail: 'art-director gauntlet, screenshots, score 0-10 against CS2' },
    { title: 'Integrate', detail: 'apply core requests, fix seams, keep the integrated game shippable' },
  ],
}

const ROOT = '/home/user/SimBuild'
const REF = '/tmp/claude-0/-home-user-SimBuild/c06ed41b-9bdf-5ab7-ace6-40b62a5e4281/scratchpad/ref'
const PASS = 8.5
const MAX_ROUNDS = 4
const ROUNDS_PER_RUN = (args && args.roundsPerRun) || 2
const NOTES = (args && args.notes) || ''

const BUILD_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    screenshotsViewed: { type: 'array', items: { type: 'string' } },
    acceptanceMet: { type: 'array', items: { type: 'string' } },
    acceptanceMissed: { type: 'array', items: { type: 'string' } },
    drawCalls: { type: 'number' }, triangles: { type: 'number' }, errors: { type: 'number' },
    remainingWeaknesses: { type: 'array', items: { type: 'string' } },
    coreRequestFile: { type: 'string' },
    selfScore: { type: 'number' },
  },
  required: ['summary', 'screenshotsViewed', 'drawCalls', 'errors', 'remainingWeaknesses', 'selfScore'],
}

const CRITIC_SCHEMA = {
  type: 'object',
  properties: {
    score: { type: 'number' },
    pass: { type: 'boolean' },
    consoleErrors: { type: 'number' },
    maxDrawCalls: { type: 'number' },
    apiContractOk: { type: 'boolean' },
    acceptanceFailed: { type: 'array', items: { type: 'string' } },
    issues: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          rank: { type: 'number' }, severity: { type: 'string' }, title: { type: 'string' },
          detail: { type: 'string' }, evidence: { type: 'string' },
        },
        required: ['rank', 'severity', 'title', 'detail'],
      },
    },
    strengths: { type: 'array', items: { type: 'string' } },
    reportFile: { type: 'string' },
    summary: { type: 'string' },
  },
  required: ['score', 'pass', 'consoleErrors', 'maxDrawCalls', 'apiContractOk', 'issues', 'reportFile', 'summary'],
}

const INTEGRATE_SCHEMA = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    coreChanges: { type: 'array', items: { type: 'string' } },
    coreRequestsRejected: { type: 'array', items: { type: 'string' } },
    seamsFixed: { type: 'array', items: { type: 'string' } },
    crossCuttingOpen: { type: 'array', items: { type: 'string' } },
    errorsRemaining: { type: 'array', items: { type: 'string' } },
    drawCalls: { type: 'number' },
  },
  required: ['summary', 'coreChanges', 'seamsFixed', 'errorsRemaining'],
}

function builderPrompt(mod, round, prev) {
  const retry = round > 1
    ? `\nThis is round ${round}. ${prev
        ? `The critic scored round ${round - 1} at ${prev.score}/10 (pass ≥ ${PASS} with zero console errors). Read ${prev.reportFile || `${ROOT}/docs/critic/${mod}_r${round - 1}.md`} in full. Ranked issues, fix in this order:\n${(prev.issues || []).map(i => `  ${i.rank}. [${i.severity}] ${i.title} — ${i.detail}${i.evidence ? ` (evidence: ${i.evidence})` : ''}`).join('\n')}\nAcceptance items the critic marked failed: ${(prev.acceptanceFailed || []).join('; ') || 'none listed'}.\nDo not regress these strengths: ${(prev.strengths || []).join('; ') || 'none listed'}.`
        : `Read ${ROOT}/docs/critic/${mod}_r${round - 1}.md and .json for the ranked issues and fix them in rank order.`}`
    : ''
  return `You are the BUILDER for the "${mod}" module of SimBuild (${ROOT}).

Follow ${ROOT}/docs/prompts/BUILDER.md exactly — it is your role contract, read it first and in full.
Your specification is ${ROOT}/docs/prompts/modules/${mod}.md — its acceptance checklist is what you are graded on.
Reference screenshots for the visual bar are in ${REF}/ (cs2_1.jpg … cs2_8.jpg); look at them with the image reader.
${retry}
${NOTES ? `\nOrchestrator notes for this wave (act on what applies to your module):\n${NOTES}` : ''}

Round number for your completion record (${ROOT}/docs/builds/${mod}_r${round}.json): ${round}.`
}

function criticPrompt(mod, round) {
  return `You are the CRITIC for the "${mod}" module of SimBuild (${ROOT}), round ${round}.

Follow ${ROOT}/docs/prompts/CRITIC.md exactly — it is your role contract, read it first and in full.
Grade against the acceptance checklist in ${ROOT}/docs/prompts/modules/${mod}.md, plus the hard-fail list in your role file.
Calibrate on all eight CS2 reference images in ${REF}/ before scoring.

Write ${ROOT}/docs/critic/${mod}_r${round}.md and ${ROOT}/docs/critic/${mod}_r${round}.json (ARCHITECTURE §14 schema,
plus an "acceptanceFailed" array naming the acceptance items that failed by their number and title).
Return the same verdict as structured output with reportFile set to the .md path.`
}

async function runModule(spec) {
  const mod = spec.name
  let round = spec.round || 1
  let phase = spec.phase || 'build'
  let critique = null
  let status = 'in-progress'
  let didRounds = 0
  const history = []
  while (round <= MAX_ROUNDS && didRounds < ROUNDS_PER_RUN) {
    if (phase === 'build') {
      log(`${mod}: build round ${round}`)
      const build = await agent(builderPrompt(mod, round, critique), {
        label: `build:${mod}:r${round}`, phase: 'Build', schema: BUILD_SCHEMA, effort: 'high',
      })
      if (!build) { status = 'builder-failed'; log(`${mod}: builder r${round} failed — stopping this module`); break }
      phase = 'critic'
    }
    log(`${mod}: critic round ${round}`)
    critique = await agent(criticPrompt(mod, round), {
      label: `critic:${mod}:r${round}`, phase: 'Critic', schema: CRITIC_SCHEMA, effort: 'high',
    })
    if (!critique) { status = 'critic-failed'; log(`${mod}: critic r${round} failed — stopping this module`); break }
    history.push({ round, score: critique.score, pass: critique.pass, errors: critique.consoleErrors })
    log(`${mod}: r${round} score ${critique.score} pass=${critique.pass} errors=${critique.consoleErrors}`)
    if (critique.pass && critique.score >= PASS && critique.consoleErrors === 0) { status = 'pass'; break }
    round++; phase = 'build'; didRounds++
    if (round > MAX_ROUNDS) status = 'exhausted'
    else if (didRounds >= ROUNDS_PER_RUN) status = 'paused-round-cap'
  }
  return {
    module: mod, status, lastRound: Math.min(round, MAX_ROUNDS),
    finalScore: critique ? critique.score : null,
    openIssues: critique ? (critique.issues || []).slice(0, 6) : [],
    history,
  }
}

const specs = (args && args.modules) || []
log(`wave ${args && args.wave}: ${specs.map(s => `${s.name}@${s.phase}${s.round}`).join(', ')}`)
const results = (await parallel(specs.map(s => () => runModule(s)))).filter(Boolean)

let integration = null
if (args && args.integrate) {
  phase('Integrate')
  integration = await agent(
    `You are the INTEGRATOR for SimBuild (${ROOT}), after wave ${args.wave}.

Follow ${ROOT}/docs/prompts/INTEGRATOR.md exactly — it is your role contract, read it first and in full.

This wave's results: ${results.map(r => `${r.module} (${r.status}, score ${r.finalScore ?? 'n/a'}${(r.openIssues || []).length ? `, top open: ${r.openIssues.slice(0, 3).map(i => i.title).join('; ')}` : ''})`).join(' · ')}.
Wave modules to include in your per-showcase seam pass: ${specs.map(s => s.name).join(', ')}.
Use w${args.wave} as the prefix for your integration shots.
${NOTES ? `\nOrchestrator notes for this wave:\n${NOTES}` : ''}`,
    { label: `integrator:w${args.wave}`, phase: 'Integrate', schema: INTEGRATE_SCHEMA, effort: 'high' },
  )
}

return { wave: args && args.wave, results, integration }
