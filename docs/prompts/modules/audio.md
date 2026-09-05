# Module spec — `audio`

Round 1 shipped (`docs/builds/audio_r1.json`, self-score 7.0) and has **no critic report yet**: round 2 is the first
graded round, and it will be graded against the checklist in §4 of this file, not against what r1 happened to build.
What r1 got right — pure-JS deterministic synthesis, a gesture-gated mixer that never opens an `AudioContext` in
headless, a CS2-styled panel with live mix meters — is now contract and must not regress. What r1 got wrong or never
finished is listed in §6; none of it may be rediscovered at the cost of a round.

Two measured facts from r1 that already fail the bar, before anyone looks at a picture:
`shots/audio/r1/summary.json` reports **996 288 triangles against a declared budget of 900 000** (an automatic budget
fail under CRITIC.md), and `shots/audio/r1/imgstats.json` reports `closeup_22.png` mean luminance **56.2** where
`environment`'s own night aerial measures **43** (a milky-night fail) and `closeup_12.png` with `bootFrame: true`
(the capture caught the boot overlay).

Role-invariant rules — what you may write, the verification loop, determinism, instancing, no per-frame allocation,
reporting, never inflate — live in `docs/prompts/BUILDER.md` and `docs/prompts/CRITIC.md` and are not repeated here.

---

## 1. Purpose

Without `audio` the city is a silent film: nothing tells the player that it is dawn or midnight, that they are hovering
at 1 400 m or standing on a kerb, that they are over a factory or a park, that it is raining, or that the click they
just made did anything — this module is the entire non-visual channel of feedback and place.

## 2. World data owned

**`audio` owns no `world.<section>`.** ARCHITECTURE §3 defines no audio section, and this module **must not write to
`world`** — not a new key, not a field on someone else's section. All of its state is published through `api`
(§2.3). If you conclude a `world.audio` section is genuinely required, write `docs/core-requests/audio.md` with the
exact proposed §3 diff and work around its absence meanwhile; do not add it yourself.

### 2.1 Events consumed

`audio` is the sink for the one audio event in ARCHITECTURE §5, copied verbatim:

| Event | Emitter | Payload |
|---|---|---|
| `audio:play` | any | `{sound, x?, z?, volume?}` (audio listens) |

`x`/`z` are world metres (§2: 1 unit = 1 m, +X east, −Z north). `volume` is 0..1 and defaults to 1. This module
extends the accepted payload with an optional `rate` (playback rate, 0.5..2) and `bus` (`'ambient'|'world'|'ui'`);
both are optional and an emitter that omits them must behave exactly as today.

Also consumed. **Copied from ARCHITECTURE §5** (payload column verbatim from that table — if it disagrees with a
line below, §5 wins and this file is the bug):

| Event | Payload | What audio must do with it |
|---|---|---|
| `time:tick` | `{hour, day, dt}` | drives the diurnal mix; **the only clock** — no `Date.now()`/`performance.now()` in logic |
| `time:hour` | `{hour:int, day}` | hourly one-shots (church bell at 12 and 18, dawn-chorus arming) |
| `weather:changed` | `{cloudiness, rain, fogDensity}` | rain/thunder/wind targets |
| `camera:changed` | `{position, target, distance}` (throttled ~10 Hz) | zoom mix; audio may also read `ctx.camera` each frame |
| `buildings:changed` | `{added:[id], removed:[id], updated:[id]}` | `build_place` / `bulldoze`, positional, rate-limited |
| `roads:changed` | `{added:[edgeId], removed:[edgeId], nodes:[id]}` | `road_place` / `bulldoze`, rate-limited |
| `zones:changed` | `{cells:[key], lots:{added:[id], removed:[id]}}` | `zone_paint`, rate-limited |
| `sim:tick` | `{tick, economy}` (4 Hz game time) | optional; may bias the crowd/industry beds |
| `sim:demand` | `{residential, commercial, industrial, office}` | optional; may bias the crowd/industry beds |
| `selection:changed` | `{kind, id}` | `ui_hover` |
| `tool:changed` | `{tool, options}` | `ui_click` |
| `ui:action` | `{action, args}` | the UI sound map, §4 item 22 |
| `module:error` | `{module, phase, error}` | `ui_error`, once per module per 10 s |
| `app:ready` | `{}` | arms the world/UI sound layers (nothing fires before it) |

**Defined by their owning spec, not by ARCHITECTURE §5** — these two are not in the §5 table, so their payloads are
copied verbatim from the specs that own them:

| Event | Payload (verbatim) | Source | What audio must do with it |
|---|---|---|---|
| `services:changed` | `{added:[id], removed:[id], updated:[id]}` | `docs/prompts/modules/services.md` §2 | `build_place`, positional if `world.services.items.get(id)` resolves; **audio reads `added` only** and ignores `removed`/`updated` |
| `sim:milestone` | `{level, name, unlocks, reward, population}` | `docs/prompts/modules/simulation.md` §2 | `milestone` fanfare + ambience duck; **audio uses none of the fields** — the event's arrival is the whole trigger |

(ARCHITECTURE §15 mentions `sim:milestone {level, name, unlocks}`; the `simulation` spec is the newer and owning
definition and is the one copied here. Since audio reads no field of it, the difference cannot bite either way.)

### 2.2 Events emitted

`audio` emits exactly two events, both new and both declared here as this module's extension of the §5 table (the
`simulation` spec sets the precedent for module-specific event names). Payload objects are pre-allocated and reused.

| Event | Payload | Cadence |
|---|---|---|
| `audio:state` | `{enabled:boolean, state:'headless'\|'idle'\|'suspended'\|'running'\|'closed', master:0..1, muted:boolean, buses:{ambient,world,ui}}` | on every state/volume/mute change only — never per frame |
| `audio:mix` | `{hour, distance, zone:string, beds:{…}, birdRate, rms}` | throttled to **≤ 4 Hz**, same object reused |

`ui` renders its speaker button from `audio:state`; nothing may depend on `audio:mix`.

### 2.3 API contract (`ctx.modules.audio`, probe handle `window.__sim.registry.apis.audio`)

Every function below must exist with this exact name and shape. Names marked **new** do not exist in r1; the rest are
r1's surface and are now frozen — changing a name or a return shape is a contract break the critic fails on.

```js
setMasterVolume(v: 0..1) -> number          getMasterVolume() -> 0..1
mute(on = true) -> boolean                  unmute() -> boolean
toggleMute() -> boolean                     isMuted() -> boolean
setBusVolume(bus, v) -> number              getBusVolume(bus) -> number      // bus ∈ 'ambient'|'world'|'ui'
play(name, {x?, z?, volume?, rate?, bus?}) -> boolean     // true iff audible output was scheduled
enable() -> Promise<boolean>                isEnabled() -> boolean
state() -> 'headless'|'idle'|'suspended'|'running'|'closed'
sampleRate() -> number                      sounds() -> [{name, group, label, desc, loop, seconds, channels, sampleRate}]
getBuffer(name) -> {name, group, channels:[Float32Array], sampleRate, loop, gain, seconds} | null
getMix() -> live mix object (see below)     serialize() -> {master, muted, bus}
deserialize(d) -> void
setAmbienceHint({ traffic?: 0..1 | null,
                  zone?: {residential, commercial, industrial, office, park, water} | null }) -> void
// new in round 2:
mixFor(state) -> targets                    // PURE; see §4 item 7
probeVoice(name, {x, z}) -> {volume, pan, cutoffHz, wouldPlay:boolean}   // PURE, non-scheduling; see §4 item 14
stats() -> {sounds, samples, bufferBytes, renderMs, sampleRate, voices, voicesPeak, dropped,
            audioContexts, updateMs, schedulerEvents, headless:boolean}
zoneMix() -> {residential, commercial, industrial, office, park, water}   // 0..1, sums ≤ 1.05
rms() -> number                             // 0..1 output level; real analyser when live, modelled when headless
setScenario(name) -> boolean                // 'dawn'|'noon'|'dusk'|'night'|'rain'|'clear'|'aerial'|'street'|'industrial'|'commercial'|'park'
duck(db, seconds) -> void                   // ambient+world bus duck; used by milestone/notification
```

**`setAmbienceHint` — the exact argument type**, because two of the graded items pass it and r1 accepts only
`{traffic}` (`src/modules/audio/index.js:261`), so `zone` is entirely new surface with no precedent to fall back on:
both fields are optional and independent; `traffic` is a scalar `0..1`; `zone` is an object of **six weights, each
`0..1`**, with the exact keys `residential, commercial, industrial, office, park, water` — omitted keys are 0, the six
are normalised internally to sum to 1, and an all-zero object is ignored. Passing `null` for a field clears that
override and restores the world-sampled value; omitting a field leaves it unchanged; the call returns `void` and never
throws on a malformed argument. Item 10's "flips industrial→park" therefore means
`setAmbienceHint({zone:{industrial:1}})` followed by `setAmbienceHint({zone:{park:1}})`.

**`probeVoice(name, {x, z})`** is the read-only twin of `play`: it runs the exact positional law `play` would run for
that sound at that world position with the camera where it is, and returns what `play` *would* do — it schedules
nothing, touches no voice list, emits no event, logs nothing and advances no counter (`api.stats().schedulerEvents` is
unchanged across any number of calls). It returns **one reused object** (allocation-free, same identity every call, so
a caller that needs two results must copy the first); `wouldPlay` is exactly what `play` would return, `cutoffHz` is
the distance low-pass corner it would apply. It exists so item 14 can grade the positional law without changing
`play`'s frozen `-> boolean` return.

`getMix()` returns a single object, reused every frame (never reallocated), of exactly this shape:

```js
{ beds: {wind, leaves, rain, crickets, traffic_far, traffic_near, industry, crowd, water},   // 0..1 each
  cutoff: {…same keys…},                                                                     // Hz
  birdRate: number,                                                                          // events/s
  poisson: {bird, owl, thunder, car},                                                        // events/s, each ≥ 0
  reverb: {wet: 0..1, rt60: seconds},
  factors: {hour, night, day, dawnChorus, dist, near, rain, windSpeed, temperature, traffic,
            zone:{residential, commercial, industrial, office, park, water}} }
```

**`out` in `mixTargets(state, out)` (§4 item 7) has exactly this shape and no other** — the same keys, the same
nesting, the same units — because `getMix()` is `mixTargets` filling the module's own persistent object. That is the
declared shape items 8–11 read `beds`, per-bed `cutoff`, `birdRate`, `poisson.*` and `reverb.rt60` out of; nothing may
be graded from a field that is not in this block. `poisson` is new this round and is the scheduler's per-second event
rates (`bird`, `owl`, `thunder`, `car`); `birdRate` and `poisson.bird` are the same number, kept in both places
because r1's panel and the `audio:mix` payload already publish `birdRate`.

## 3. Visual / behavioural target

Per CRITIC.md, `audio` is a **non-visual module**, scored on *correctness, determinism (same seed ⇒ same numbers),
robustness with neighbours stubbed, API completeness, and the polish of its showcase panel*. Weighting the critic must
use: **60 % soundscape correctness (selftest JSON + live probe + API probes) · 25 % the panel · 15 % the staged park.**
A beautiful park cannot rescue a broken soundscape, and a correct soundscape behind a programmer-art frame with a milky
night still trips the CRITIC.md hard-fail list.

### 3.1 The unavoidable problem, and the required answer

`tools/screenshot.mjs` **always** appends `headless=1` to the URL (line 22). Every gauntlet frame therefore has
`ctx.headless === true`, no `AudioContext` is ever created, and r1's panel consequently reads `Idle · headless` with
dead meters in all sixteen shots — the critic could not see the module work at all.

The required answer, and the single largest change this round: **in headless the module runs its whole model anyway.**
The mix model, the Poisson scheduler, the virtual voice list, the duck, the bus levels and a modelled output level
(`rms()` computed from the current bed levels and the RMS of their buffers, plus decaying contributions from live
virtual voices) all keep running exactly as they would with a context; only the WebAudio graph is absent. The panel
must therefore show moving meters, moving VU/spectrum and a scrolling event log in every screenshot, under a state pill
that reads **`HEADLESS · SIMULATED TRANSPORT`** so nobody mistakes it for real output. Where a value is modelled rather
than measured, the panel labels it — but it is never frozen at zero.

**This does not contradict ARCHITECTURE §12, and the critic must not read it as one.** §12's quality bar for `audio`
ends "all gated behind a user gesture and disabled in headless"; "disabled in headless" means **no `AudioContext` and
no audible output**, and both still hold — item 15 grades exactly that (`__acCount === 0` after `__sim.ready` and
after 5 s, `api.state() === 'headless'`, `api.stats().audioContexts === 0`, `api.enable()` resolving `false`). Running
the mix model, the Poisson scheduler and the meters with no audio graph attached is not a violation of §12, is not a
contract break, and needs no `docs/core-requests/audio.md` entry: the gesture gate and the headless mute are both
still enforced, and §12 is silent on whether the numbers behind a silent mixer keep moving.

### 3.2 What correct looks like in the panel

Target `$REF/cs2_5.jpg` (the citizen info panel) for the chrome: dark translucent glass, small uppercase
letter-spaced grey labels left, values right-aligned in white tabular figures, hairline dividers, a cyan
(#2f8ff5-class) accent, coloured status chips. Target `$REF/cs2_7.jpg` (the INDUSTRIAL map-legend panel) for the
*information* pattern: a titled block, a stack of named rows each with its own colour swatch and a gradient bar with
"Low / High" end labels, and a checkbox column — that is exactly the shape the ambient-mix meters and the 24-hour
timeline must take. r1's panel is already close to this and its meters, chips, scenario buttons and waveform rows are
strengths to preserve; what it lacks is a spectrogram per sound, a live VU/spectrum, bus faders, a 24-hour timeline,
and a 720p layout that does not clip.

### 3.3 What correct looks like in a probe

**Three** scripts the module ships and the critic runs. All three live inside your blast radius,
`src/modules/audio/**` — BUILDER.md's "what you may write" list is `src/modules/<module>/**`,
`public/assets/manifest.json`, `docs/core-requests/` and `docs/builds/`, and does **not** include `tools/` or a script
committed under `shots/`. The scripts therefore live in the module folder; only their *output* is written to
`shots/audio/r<n>/`.

- `node src/modules/audio/selftest.mjs --seed 1337 --json shots/audio/r<n>/selftest.json` — **pure node, no browser,
  no `three` import.** It imports `synth.js` and `mix.js` directly, renders the whole catalogue, and writes the DSP,
  loop, spectral, level, determinism and mix-curve tables that items 1–11 are graded from. `mix.js` must therefore
  contain the mix model as a pure function with zero Three.js and zero DOM imports. The **one** core import it is
  allowed — and required — to make is `Clock` from `src/core/clock.js` for the sun curve (item 8); that file is pure
  ES with no `three` and no DOM import, so it loads in plain node. Nothing else from `src/core/` may be imported.
- `node src/modules/audio/liveprobe.mjs --json shots/audio/r<n>/live.json` — Playwright, **without** `headless=1` in
  the URL and with the autoplay policy relaxed, so a real `AudioContext` runs and the real graph can be measured.
  **Launch exactly as CRITIC.md's `apicheck` probe block does**, with exactly two deltas: no `headless=1` in the URL,
  and `--autoplay-policy=no-user-gesture-required` appended to `args`. Do **not** hard-code a Chromium path — resolve
  `executablePath` the way `tools/screenshot.mjs:28` does, so a browser bump does not break this module:

  ```js
  const executablePath = process.env.SIM_CHROME
    || ['/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
        '/opt/pw-browsers/chromium/chrome-linux/chrome'].find((p) => fs.existsSync(p));
  // then CRITIC.md's args + '--autoplay-policy=no-user-gesture-required'
  // http://127.0.0.1:5173/?showcase=audio&time=12&seed=1337   (NO headless=1)
  ```

  Then a real `page.mouse.click` on the Enable button, tap the master gain with an `AnalyserNode` and sample
  `getFloatTimeDomainData` over ≥ 2 s per scenario. It writes exactly:

  ```js
  { contextState, sampleRate, baseLatency,
    scenarios: {name: {rmsDb, peakDb, centroidHz}},
    muteRmsDb, duckDb, duckRecoverS, rt60S,
    voicesPeak, voicesDropped,
    voiceDrop: {maxDroppedVolume, minPlayedVolume},   // item 13; requested volumes, 0..1
    filter:    {db4kAt10m, db4kAt300m},               // item 14; dBFS at 4 kHz, same sound, two distances
    errors: [] }
  ```

- `node src/modules/audio/imgstats.mjs --dir shots/audio/r<n> --json shots/audio/r<n>/imgstats.json` — pure node, no
  browser, reads the round's PNGs and writes one row per shot with every image measurement items 23–25 are graded
  from: `{shot: {meanL, p1, p50, p99, pctOver245, tilingR, horizonDeltaL, poolCount, poolPx, fogColor, horizonRow,
  stagedPct, bootFrame}}`. §4 item 24 defines each of those measurements exactly; the critic reads the JSON, not the
  script.

### 3.4 What correct looks like in the frame

The staged park is a backdrop, not the product; it must nonetheless not fail CRITIC.md's hard list. Reference
`$REF/cs2_4.jpg` for daylight ground: within 10 m there is mown grass, worn dirt, hedge shadow, kerb and path — never
one flat tone — and every object has a contact shadow. Reference `$REF/cs2_8.jpg` for night: the ground is **dark**,
light exists only as pools under lamps and spill from lit surfaces, the sky is deep blue rather than dusk grey.
Reference `$REF/cs2_2.jpg` for distance: terrain loses contrast into a warm haze band and merges with the sky — there
is no razor line. r1's `street_12.png` is a smooth green felt to a hard horizon with a bush of green static at frame
right; `closeup_22.png` is a fully lit lawn at 22:00 with weak lamp pools. Both are hard fails below.

**Permitted, and stated so it is not treated as cheating: shrink the backdrop instead of upgrading it.** A tight,
well-lit park with a short ground plane that has fully faded into the fog colour before its edge scores better than
1 400 m of hills and 2 000 trees at 996 k triangles. Whatever stays in frame must meet the bar; **item 25's
`stagedPct ≥ 25` (defined and measured in item 24) is the floor that stops a shrunk backdrop becoming an empty
frame**, and it is the one number that makes this permission safe to grant.

## 4. Acceptance criteria

Ordered by how much each moves the score. Every item is observable in a screenshot, in `summary.json`, in
`selftest.json`, in `live.json`, in `imgstats.json`, or in a `page.evaluate` probe. In-page handle for all probes:
`const api = window.__sim.registry.apis.audio`. `$REF` = the reference folder named in `docs/reference/CS2-LOOK.md`.

### Soundscape correctness — the catalogue (graded from `selftest.json`)

1. **The catalogue covers a city, not a park.** `api.sounds().length ≥ 35`, in three groups, and containing at least
   these names:
   - `ambient` (looping beds, ≥ 9): `wind`, `leaves`, `rain`, `crickets`, `traffic_far`, `traffic_near`, `industry`,
     `crowd`, `water`.
   - `world` (positional one-shots, ≥ 12): `bird_robin`, `bird_finch`, `bird_crow`, `bird_gull`, `owl`, `dog_bark`,
     `car_pass`, `car_horn`, `siren`, `church_bell`, `train_horn`, `thunder`.
   - `ui` (≥ 14): r1's twelve (`ui_click`, `ui_hover`, `ui_open`, `ui_close`, `ui_confirm`, `ui_error`, `build_place`,
     `road_place`, `zone_paint`, `bulldoze`, `cash`, `milestone`) plus `ui_notify` and `ui_slider`.
   Every entry carries a non-empty `label` and `desc`, and every `ambient` entry has `loop === true`, `channels === 2`.
2. **Every buffer is clean, loud enough, and band-complete.** For every sound in `selftest.json`:
   peak ≤ 0.95 (no sample at ±1.0); `|mean| ≤ 0.002` (DC offset); no NaN/Inf; no run of > 30 ms of exact zeros inside
   a bed. Integrated RMS: beds ∈ [−26, −16] dBFS, one-shots ∈ [−24, −8] dBFS. `sampleRate ≥ 32000` for **every**
   sound (r1's 24 000 Hz caps the band at 12 kHz and makes leaves, rain and UI transients dull); `leaves` and `rain`
   each carry ≥ 8 % of their total energy above 8 kHz.
3. **Beds are seamless and do not audibly repeat.** For each of the nine beds: length ≥ 8 s (`wind`, `traffic_far`,
   `traffic_near`, `industry` ≥ 12 s); loop-point discontinuity `|x[0] − x[N−1]| ≤ 0.02 × peak`; the RMS of a 50 ms
   window straddling the wrap is within 15 % of the bed's mean RMS; and the normalised autocorrelation of the 20 ms
   RMS envelope has `max |r| < 0.5` for lags between 0.2 s and half the loop length.
4. **Beds occupy different parts of the spectrum** (so nine layers do not become mud). From the third-octave energy
   table in `selftest.json`: `wind` ≥ 55 % of energy below 500 Hz; `traffic_far` ≥ 55 % below 300 Hz and ≤ 8 % above
   3 kHz; `traffic_near` peak band ∈ [100 Hz, 2 kHz]; `industry` ≥ 45 % below 400 Hz **and** ≥ 2 tonal partials
   ≥ 10 dB above the local noise floor; `crowd` ≥ 50 % within 200 Hz–2 kHz; `crickets` ≥ 45 % within 3–6 kHz;
   `leaves` ≥ 50 % above 2 kHz; `water` ≥ 50 % within 400 Hz–4 kHz; `rain` spread across ≥ 6 third-octave bands with
   no band > 25 % of total.
5. **Stereo is a field, not a duplicate.** For every stereo sound: inter-channel correlation ∈ [0.20, 0.85], and the
   mono sum's RMS ≥ 0.7 × the stereo RMS (no phase cancellation on mono playback).
6. **Determinism.** Two runs of `selftest.mjs --seed 1337` produce JSON that is **byte-identical after deleting the
   top-level `timing` object** — `timing` (`renderMs`, `sweepMs`, `wallMs`, and nothing else) is the *only* block
   permitted to vary between runs, and every other field, including the per-sound `sha256` buffer hashes, must match
   exactly. No timing, date or duration value may appear anywhere outside `timing` — a `renderMs` field sprinkled
   through the per-sound rows would fail a correct, fully deterministic module for a reason unrelated to determinism,
   which is why it is confined to one block. The check is: read both files, `delete json.timing`, compare
   `JSON.stringify`. `--seed 42` differs in ≥ 30 of the ≥ 35 hashes. Two headless page loads of
   `?showcase=audio&time=12&seed=1337&headless=1` return an identical `JSON.stringify(api.serialize())` and identical
   `api.stats().samples`. `grep -rn "Math.random\|Date.now()\|performance.now()" src/modules/audio/` returns nothing
   outside `selftest.mjs`/`liveprobe.mjs` and the one profiling line in `init()`.

### Soundscape correctness — the mix model (graded from `selftest.json`, model stepped in node)

7. **The mix model is pure and testable.** `src/modules/audio/mix.js` exports
   `mixTargets(state, out)` where `state = {hour, sunElevation, distance, rain, wind, temperature, cloudiness,
   traffic, congestion, zone:{residential,commercial,industrial,office,park,water}}` and `out` is a caller-supplied
   object it fills (zero allocation) **with exactly the `getMix()` shape declared in §2.3, `poisson` block included**.
   It imports nothing from `three`, the DOM or `ctx`. `api.mixFor(state)` calls it. `selftest.mjs` sweeps it and
   writes the tables items 8–11 are read from. Every returned level is finite and ∈ [0,1] at **every point of the
   item 8 hour sweep crossed with the item 9 distance sweep — 481 hour steps × 16 distance steps = 7 696 points**,
   and
   `selftest.json` writes `gridPoints: 7696` and `gridFinite: true` at the top level, so the critic checks two
   integers instead of reconstructing a grid. (Any other grid size is a fail even if the model is correct: 7 696 is
   the number both sides count.)
8. **Time of day is a curve, not a switch.** Sweeping `hour` 0→24 in 0.05 h steps at `distance = 110, rain = 0,
   wind = 3, temperature = 18, zone = residential 1` — **481 steps, hour 0.00 through 24.00 inclusive**.
   `sunElevation` is an input to `mixTargets` independent of `hour`, so it is pinned here: **`sunElevation` at each
   hour is `clock.sunElevation(hour)` from `src/core/clock.js`**, which is pure ES with no `three` and no DOM import,
   so `selftest.mjs` imports it directly —
   `new Clock({ time: { hour: 12, day: 1, speed: 1, paused: false } }, { emit() {} }).sunElevation(h)` (only the
   `hour` argument is read) — or lifts its two-line formula verbatim. **Do not invent a second sun curve**: the
   cricket, `birdRate` and no-snap tables below are only reproducible if builder and critic use the same one, and
   `selftest.json` writes `sunCurve: 'core/clock.js'` to say which was used.
   - `crickets` = 0 whenever `sunElevation > 0.05`; ≥ 0.6 × its own maximum throughout 22:00–04:00; = 0 at
     `temperature ≤ 5`; ≤ 0.15 × max at `rain ≥ 0.6`.
   - `birdRate` = 0 for 22:00–04:00; its 06:00–07:30 maximum ≥ 2.0 × its 12:00 value; a second local maximum in
     17:30–19:00 ≥ 1.3 × the 12:00 value.
   - `traffic_near` has a **double diurnal bump**: its values at 08:00 and at 17:30 are each ≥ 1.8 × its value at
     03:00, and its 03:00 value ≤ 0.30 × its 08:00 value. (r1 had a single `1 − 0.6·night` ramp.)
   - **No snap:** for every bed, `max |Δlevel|` between consecutive 0.05 h steps ≤ 0.03.
9. **Zoom rewrites the mix.** Sweeping `distance` at `hour = 12` over exactly these **16 log-spaced steps**
   (`40 × (1400/40)^(k/15)`, `k = 0…15`, printed so builder and critic tune and read the same points — every
   threshold below is stated against a step number, never against an unsampled distance):

   | step | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 |
   |---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
   | m | 40 | 50.7 | 64.3 | 81.4 | 103.2 | 130.8 | 165.8 | 210.2 | 266.4 | 337.7 | 428.0 | 542.5 | 687.6 | 871.5 | 1104.6 | 1400 |

   `traffic_near`, `leaves`, `crowd` and `water` each fall monotonically (allowing ≤ 0.01 non-monotonic noise) by
   ≥ 70 % from step 1 to step 16; `traffic_far` **rises ≥ 60 % from step 1 to step 12 (542.5 m) and then varies
   ≤ 15 % across steps 12–16** (`max/min − 1 ≤ 0.15` over those five values); the low-pass cutoff of every bed falls
   monotonically from ≥ 9 000 Hz at step 1 to ≤ 1 200 Hz at step 16; `reverb.rt60` ≥ 0.8 s at every step ≤ 120 m
   (steps 1–5) and ≤ 0.4 s (or `wet = 0`) at every step ≥ 800 m (steps 14–16). **The sum of all bed levels never
   leaves [0.35, 2.2] at any of the 16 steps** — there is no zoom level at which the city goes silent or turns to
   mush. `selftest.json` writes the 16 distances it actually used as `distanceSteps`, and they must round to the row
   above.
10. **Zone under the camera drives the ambience.** With `distance = 110, hour = 12`:
    pure `industrial` ⇒ `industry ≥ 0.60` and `crowd ≤ 0.15`; pure `commercial` ⇒ `crowd ≥ 0.50` and
    `industry ≤ 0.10`; pure `park` ⇒ `leaves ≥ 0.45`, `birdRate ≥ 1.6 ×` its residential value, `traffic_near ≤ 0.15`;
    pure `water` ⇒ `water ≥ 0.55`. Stepping the *live* module at 60 Hz while the zone hint flips industrial→park —
    `api.setAmbienceHint({zone:{industrial:1}})`, then `api.setAmbienceHint({zone:{park:1}})` (§2.3: omitted keys are
    0) — every bed reaches 90 % of its new target in **1.5–4.0 s** (slew-limited crossfade, no jump).

    In-page, `api.zoneMix()` resolves in the §7 degrade order, and this is the order the critic grades:
    (a) it samples `world.zones.cells`, else `world.buildings.items`, within a radius of
    `0.5 × camera.distance + 60` m; (b) **when both are empty it returns the blend last supplied through
    `setAmbienceHint({zone})`**, normalised; (c) it returns all-zero — never `NaN`, never `undefined`, never a missing
    key — only when both are empty *and* no zone hint has ever been supplied.
    **In `?showcase=audio`, (a) is always empty**: this module initialises no zoning and no buildings and §2 forbids
    it writing `world`, so branch (b) is what every graded frame exercises. The showcase supplies the hint at load
    (§8), so `api.zoneMix()` must return **`park` as its largest key at the `bandstand` camera** and **`residential`
    as its largest key at `junction`** — which is also what the item 20(d) "dominant zone" chip must read. Branch (c)
    is graded by item 17's stub probe, not here; the two do not overlap.
11. **Weather is audible.** At `rain = 0.7` versus `rain = 0`, same hour/distance: `birdRate` falls ≥ 80 %,
    `leaves` falls ≥ 40 %, `rain` bed ≥ 0.55, and every bed's cutoff falls ≥ 25 %. The thunder Poisson rate is 0 for
    `rain < 0.45` and > 0 above it. `wind.speed` 1 → 9 m/s raises the `wind` bed ≥ 2.5 × and `leaves` ≥ 3 ×.

### The live graph (graded from `live.json`)

12. **It actually makes sound, and the sound follows the model.** `live.json`: `contextState === 'running'`,
    `sampleRate ≥ 44100`, `errors: []`. Measured `rmsDb` for the scenarios `noon`, `night`, `rain`, `aerial`,
    `street`, `industrial` are all ∈ [−34, −14] dBFS, all six differ from each other by ≥ 1.5 dB, and their measured
    spectral centroids order the same way the model's cutoffs do (`aerial` centroid < `street` centroid,
    `night` centroid > `noon` centroid because crickets replace traffic).
13. **Mute, duck, voices, suspend.** `api.mute(true)` ⇒ measured `muteRmsDb ≤ −80` within 200 ms and back within
    200 ms of `unmute()`. `api.duck(-6, 0.9)` and the `milestone` fanfare each duck the ambient bus by 4–8 dB and
    fully recover within 1.5 s (`duckDb`, `duckRecoverS`). Firing 40 one-shots inside 200 ms, with requested volumes
    spread over 0.05…1.0: `voicesPeak ≤ 18`, `voicesDropped ≥ 22`, zero console errors, and **the quietest requests
    are the ones dropped** — graded as `live.json.voiceDrop.maxDroppedVolume ≤ live.json.voiceDrop.minPlayedVolume`,
    i.e. the loudest request that was refused or evicted is no louder than the quietest request that was kept. (r1's
    mixer already implements exactly this policy at `src/modules/audio/mixer.js:102-107`; the probe only has to
    report the two numbers, so no critic has to read source and form an opinion.) `document.hidden` ⇒ context
    `suspended` within 500 ms; visible again ⇒ `running`.
14. **Space: positional law, distance filtering, reverb.** The positional law is graded through
    **`api.probeVoice(name, {x, z})`** (§2.3) — the pure, non-scheduling probe that returns what `play` *would* do —
    so `play`'s frozen `-> boolean` return is untouched and the critic has a named field to read for every number
    below. The law, copied from r1's `trigger()` (`src/modules/audio/index.js:55-70`) and now contractual:

    ```js
    r      = 0.6 * camera.distance + 40
    d      = hypot(x - camera.target.x, z - camera.target.z)
    volume = requestedVolume * 1 / (1 + (d / r) ** 2)
    right  = (cos yaw, -sin yaw)                                   // camera-right on the ground plane
    pan    = clamp((Δ · right) / (0.8 * camera.distance + 40), -1, +1) * 0.8
    wouldPlay = (d <= 4r) && volume >= 0.01
    ```

    Probe at the `bandstand` preset (`distance = 70` ⇒ `r = 82`, pan divisor 96, `yaw = 2.60`), sound at
    `{x: target.x + d, z: target.z}` (due east), requested volume 1, at three named distances:

    | d | expected `volume` | expected `pan` | expected `wouldPlay` |
    |---|---|---|---|
    | 10 m | 0.985346 | −0.071407 | `true` |
    | 300 m | 0.069517 | −0.800000 (clamped) | `true` |
    | 329 m (`4r + 1`) | — | — | `false` |

    Both `volume` and `pan` must match the formula **to within 1e-3** at all three distances; at `4r + 1` the matching
    `api.play(name, {x, z})` returns `false`, schedules nothing, and leaves `api.stats().schedulerEvents` unchanged.
    Two consecutive `probeVoice` calls return the **same object identity** (no per-call allocation), and no
    `probeVoice` call changes `schedulerEvents`, the event log or the voice list.

    The filter and reverb halves stay in `live.json`, where they are *measured* rather than modelled: a voice at 300 m
    is low-passed by **≥ 6 dB at 4 kHz** relative to the same voice at 10 m
    (`filter.db4kAt10m − filter.db4kAt300m ≥ 6`); `rt60S` measured from an impulse on the world bus ∈ [0.8, 1.6] s at
    the `street` preset and ≤ 0.4 s at `aerial`; reverb wet ≤ −12 dB relative to dry.

### The headless contract and the API

15. **Headless creates no context and still runs the model.** With `?showcase=audio&headless=1`, an
    `addInitScript` that proxies `AudioContext`/`webkitAudioContext`/`OfflineAudioContext` constructors records
    **`__acCount === 0`** after `__sim.ready` and after 5 s of running; `api.state() === 'headless'`;
    `api.stats().audioContexts === 0`; `api.enable()` resolves `false`. And simultaneously: `api.getMix().beds` values
    change over a 3 s window (max−min ≥ 0.02 on at least three beds while the hour advances at `speed=1`),
    `api.rms() > 0.01`, and `api.stats().schedulerEvents` increases by ≥ 1 over 10 s of game time at hour 12.
16. **The API contract is complete and total.** Every function in §2.3 exists with the stated arity and return type.
    Additionally: `play('does_not_exist')` returns `false` and logs one `log.warn` (not an error, not a throw);
    `play('ui_click', {volume: 0})` returns `false`; `setMasterVolume(-1)`→0, `setMasterVolume(9)`→1;
    `setBusVolume('nope', 1)` returns `undefined` and does not throw; `probeVoice('does_not_exist', {x:0, z:0})`
    returns an object with `wouldPlay: false` and finite `volume`/`pan`/`cutoffHz`, without throwing, warning or
    scheduling; `setAmbienceHint({})`, `setAmbienceHint({zone: null})` and `setAmbienceHint(undefined)` are all
    no-throw; `deserialize(undefined)`, `deserialize({})`,
    `deserialize(api.serialize())` are all no-throw and idempotent, and after
    `api.deserialize(api.serialize())` `master`, `muted` and all three bus levels equal their pre-serialize values
    exactly. `getMix()` returns the **same object identity** on two consecutive calls (no per-frame allocation).
17. **Stub tolerance.** With `?showcase=audio` (no roads/zoning/buildings/traffic/services/simulation/ui): zero
    console errors, `modules.audio.status === 'ready'` in every shot, and no warning originating in
    `src/modules/audio/` — item 26 states the warning rule and its two exclusions, and this item uses that rule
    unchanged. A probe that deletes
    `world.zones.cells`, `world.buildings.items`, `world.traffic.stats` and `world.weather.wind` at runtime and then
    steps 120 frames must not throw and `api.getMix()` must stay finite. `dispose()` removes the panel DOM, closes the
    context, unsubscribes every listener (`events.listenerCount('audio:play') === 0` afterwards) and leaves
    `ctx.group.children.length === 0`.
18. **In the integrated game audio is inaudible to the renderer.** `?showcase=all&time=12`: `ctx.group.children.length
    === 0`, the module contributes **0 draw calls** (`constants.BUDGET.perModuleDrawCalls.audio = 0`), the showcase
    panel is not mounted, `modules.audio.status === 'ready'`, and `dev_all12.json` has `errors: []`.

### The panel

19. **Nothing clips at 1280×720.** `--w 1280 --h 720 --camera bandstand --time 12`: header, state pill, enable row,
    master + mute, bus faders, the mix meters and the footer are all inside the viewport, in a documented compact mode
    if necessary, with `max-height: calc(100vh - 36px); overflow-y: auto` and **no scrollbar needed at 1920×1080**.
    Panel width 380–430 px at 1080p and ≤ 360 px at 720p. Evidence `shots/audio/r<n>/panel_12_720p.png`.
20. **The panel shows the DSP, not just a list of names.** In `closeup_12.png` at 1920×1080 the panel contains, all
    legible: (a) the state pill reading `HEADLESS · SIMULATED TRANSPORT` (or `LIVE · <sampleRate>` when live);
    (b) master + mute + **three bus faders** with numeric percentages; (c) **nine** bed meters with numeric values and
    per-bed colour, in the `$REF/cs2_7.jpg` legend-row pattern; (d) a factor chip row including hour, zoom in metres,
    **dominant zone**, wind m/s, rain %, temperature; (e) a **24-hour mix timeline canvas** ≥ 360 × 64 px showing the
    nine beds as stacked bands across 0–24 h with a "now" marker at the current hour; (f) a **live VU/spectrum canvas**
    ≥ 200 × 40 px that is not flat; (g) the scheduler event log with ≥ 3 rows; (h) every catalogue entry as a row with
    a play button, a **spectrogram thumbnail** (time × log-frequency, ≥ 96 × 18 px, not a waveform), duration and
    group; (i) a footer with sounds, samples, buffer MB, sample rate, render ms, seed and peak voices.
    Every numeric value right-aligned in tabular figures; ≥ 5 hairline dividers; value text contrast ≥ 7:1 and label
    text ≥ 4.5:1 against the panel ground, measured on a crop.
21. **The panel is alive and is the module's own DOM.** Over a 6 s capture at `speed=1` from hour 12, at least three
    bed meters change by ≥ 2 percentage points and the event log gains ≥ 1 row (compare two screenshots 6 s apart, or
    read `api.getMix()` twice in a probe). Mounted on a module-created root `#audio-ui` appended to the core-provided
    `#ui` container from `index.html`, `z-index` below the `ui` module's HUD, removed by `dispose()`.
    `grep -rn "modules/ui\|\.\./ui/" src/modules/audio/` returns nothing. In `?showcase=all` the panel is absent
    entirely (item 18).
22. **UI feedback is feedback, not a machine gun.** `ui` emits `ui:action {action:'setAudio', args:['master', v]}` on
    every `input` event of its volume slider — r1's map plays `ui_click` for every unmapped action, so dragging the
    slider fires dozens of clicks. Required: a documented action→sound map covering at least
    `menu/pause/pauseMenu/options → ui_open`, `resume/continue/closeInfo/closeLines/dismissNotification → ui_close`,
    `save/download/upload/confirm → ui_confirm`, `load/newGame → ui_open`, `lockedCategory → ui_error`,
    `takeLoan/setTaxRate → cash`, `milestones → milestone`, `photomode/minimap/infoview/statistics/journal/budget/
    transit/weather/help/cityinfo/happiness/population/tab/category/selectAsset/toolOption/setQuality/setSpeed →
    ui_click`, and **`setAudio`, `setAutosave`, `minimapGoto` → `ui_slider` rate-limited to one per 250 ms**.
    Any unmapped action plays nothing. Probe: emit 40 `ui:action {action:'setAudio'}` in 400 ms ⇒
    `api.stats().schedulerEvents` grows by ≤ 2. Rate limits also apply to bulk world events: 50 `buildings:changed`
    with 1 id each inside 200 ms ⇒ ≤ 4 `build_place` voices.

### The staged park

23. **Night is night.** Mean luminance of the frame **excluding the panel region** (`x < 460 px` at 1080p): `aerial_22
    ≤ 46`, `street_22 ≤ 54`, `closeup_22 ≤ 54`, `skyline_22 ≤ 56` (`environment`'s night aerial measures 43; r1's
    `closeup_22` measured 56.2 with a fully lit lawn). Light must come *from* the lamps: ≥ 4 distinct pools of
    L ≥ 110 on ground or path, each ≥ 350 px, adjacent to lamp geometry, in `street_22.png` and `closeup_22.png`; no
    emissive lamp head brighter than the pool it casts. Scale ground and foliage albedo by `(1 − 0.5 ·
    world.weather.night)` rather than lighting them independently.
24. **No tiling lattice, no razor horizon, no blown golden hour.** Write **`src/modules/audio/imgstats.mjs`** (§3.3
    — inside the blast radius; BUILDER.md does not permit a script committed under `shots/`), writing its output to
    `shots/audio/r<n>/imgstats.json`, one row per shot. It computes:
    - Tiling: greyscale (Rec.709), discard columns left of `x = 460`, detrend per-column and per-row means with a
      101 px moving average, normalised autocorrelation **max |r| < 0.35** over lags 24–400 px, in `aerial_12.png`,
      `aerial_6p5.png` and `skyline_6p5.png`.
    - Horizon: in `skyline_12.png` and `skyline_6p5.png` a 20 px ground band immediately below the ground/sky boundary
      differs from a 20 px sky band above it by **ΔL ≤ 12**.
    - Golden hour: `skyline_17p5.png` and `closeup_6p5.png` each have ≤ 1.5 % of pixels > 245 and mean ≤ 150.
    - Noon: `street_12.png` and `closeup_12.png` have p99 − p1 ≥ 110 over the non-panel region and mean ∈ [85, 150]
      (r1's noon frames are low-contrast green felt).
    - No frame at 06.5/12/17.5/22 has `p1 = 0` over a region larger than 2 % of the frame.
    - **Staged content** (the measurement item 25 is graded from, defined here so it is computable rather than
      argued): per column, the **ground/sky boundary** is the topmost row whose CIE76 ΔE from that column's own top
      row exceeds 6 (columns left of `x = 460` at 1080p are the panel and are excluded throughout). `fogColor` is the
      mean RGB of the 20 px sky band immediately **above** that boundary — the same band the horizon check already
      uses. A pixel is **staged** iff it is a non-panel pixel **below** the boundary **and** its CIE76 ΔE from
      `fogColor` is **> 6** (i.e. it is park, road, bandstand, lamp or planting, not ground that has already faded
      into the haze). Report per shot: `stagedPct` = staged ÷ non-panel pixels × 100, plus `fogColor` and the median
      `horizonRow`. If a column has no such row (no sky in frame, as at `aerial_12`), its boundary is row 0 and the
      whole column counts as below it; if no column in the frame has sky, `fogColor` is the mean RGB of the top 20 px
      of the non-panel region. Required: **`stagedPct ≥ 25` in `aerial_12`, `street_12` and `closeup_12`** (item 25).
25. **The frame is staged and the shot is real.** `imgstats.json` reports **`stagedPct ≥ 25` for `aerial_12`,
    `street_12` and `closeup_12`**, using item 24's definition of staged content (non-panel pixels below the
    ground/sky boundary that are ΔE > 6 from `fogColor` — park, road, bandstand, lamps, planting, and *not* haze).
    This is the only guard on the §3.4 permission to shrink the backdrop, so it is measured, not judged: a frame that
    passes by being mostly fog fails here. No shot in the round's gauntlet is a boot-overlay frame (r1's `closeup_12` was:
    mean 20.3, `bootFrame: true`) — every shot's `summary.json` entry has `ok: true`, `moduleStatus: 'ready'`, and the
    panel visible. Planting within 60 m of any declared camera shows ≥ 3 distinguishable species by silhouette, ≥ 4
    crown-colour variants, no two adjacent instances sharing rotation and scale, and no visible icosahedron facets or
    8 %-alpha-cut green static (r1's frame-right bush). Alternatively remove planting from within 60 m of every
    declared camera — the absence satisfies the planting clause, and the `stagedPct ≥ 25` floor still applies.
26. **Budget and cleanliness.** Every shot of the round's gauntlet, all three declared presets, the 720p frame and
    `--showcase all`: `errors: []`, `modules.audio.status === 'ready'`, **`drawCalls ≤ 34`**,
    **`triangles ≤ 420 000`**, and the module's self-declared `budget: { drawCalls: 34, triangles: 420_000 }` matches
    (r1 declared 900 000 and measured 996 288).
    On warnings the rule is **`warnings` contains no entry originating in `src/modules/audio/`** — *not* `warnings: []`
    — with two exclusions, stated so this is a threshold the builder actually controls:
    - Entries matching `requestfailed: .*node_modules/\.vite/deps/` are Vite dependency re-optimisation artefacts of
      the **shared** dev server and have nothing to do with audio; `shots/audio/r1/aerial_6p5.json` already carries
      exactly two (`three.module-*.js` and `GLTFLoader…js`, both `net::ERR_ABORTED`). **Re-shoot that frame** and note
      it in the build record. Never count it, and never try to "fix" it by touching `tools/` or restarting the dev
      server — BUILDER.md forbids both.
    - The single `log.warn` that item 16 *requires* from `play('does_not_exist')` is expected behaviour and is not a
      shot warning; no gauntlet frame calls it.
    Any other warning whose text or stack names `src/modules/audio/` fails this item.

## 5. Budget

| Metric | Budget | How it is checked |
|---|---|---|
| Draw calls, in the game (`showcase ≠ audio`) | **0** — the module adds nothing to `ctx.group` | `constants.BUDGET.perModuleDrawCalls.audio = 0`; probe `ctx.group.children.length === 0` in `?showcase=all` |
| Draw calls, showcase (incl. 3 CSM cascades) | **≤ 34** | `summary.json` `maxDrawCalls`; r1 used 42 |
| Triangles, showcase | **≤ 420 000** | `summary.json`; r1 used 996 288 — trim the hills, the far belt and the tree count, do not raise the ceiling |
| `update()` per frame | **≤ 0.30 ms mean, ≤ 0.8 ms worst** over 120 frames | `__sim.stats().moduleMs.audio` |
| Panel DOM/canvas update | **≤ 0.35 ms**, DOM text ≤ 12 Hz, spectrograms drawn **once** at init, VU/timeline ≤ 20 Hz | probe timing around `Panel.update` |
| Synthesis at init | **≤ 1400 ms total**, **≤ 30 ms per macrotask slice** (chunk long beds; one 12 s stereo bed is not one slice) | `api.stats().renderMs`, `log.info` line, `elapsedMs` in the shot JSON |
| Buffer memory (Float32 + `AudioBuffer` copies) | **≤ 56 MB** | `api.stats().bufferBytes × 2`; ≥ 35 sounds at 32 kHz ≈ 20 MB of Float32 |
| Texture memory, showcase | **≤ 40 MB** — at most three 1k PBR sets plus the procedural foliage/glow/mask textures | manifest entries × resolution |
| Concurrent WebAudio voices | **≤ 18** plus 9 bed sources; nodes reused, no node churn per one-shot beyond source+gain(+panner+filter) | `live.json.voicesPeak`, `api.stats().voices` |
| JS heap growth | **≤ 2 MB over 60 s** at `speed=4` | `__sim.stats().heapMB` sampled twice |
| Init time | **≤ 2.0 s** of the 15 s init budget, synthesis included | shot JSON `elapsedMs`, `registry.status().audio.initMs` |

No per-frame allocation anywhere in `update()`, the scheduler, the mix model or the event handlers: the mix object,
the event ring, the payload objects for `audio:state`/`audio:mix`, and every vector/scratch array are allocated in
`init()`. `mixTargets(state, out)` fills a caller-supplied object for exactly this reason.

## 6. Known failure modes

Every one of these was measured in `shots/audio/r1/`, is in this module's r1 build record, or has already cost a
neighbouring module a round. Do not rediscover them.

- **The panel is dead in every graded frame.** `tools/screenshot.mjs` always sets `headless=1`; r1's pill reads
  `Idle · headless`, the VU is absent and only the pre-rendered waveforms have any content. Symptom: sixteen shots
  that prove nothing about the audio. Fix: §3.1's simulated transport.
- **Milky night.** A lawn shader that keeps its own tint at 22:00 and lamp pools that are weaker than the ambient
  ground. Symptom: `closeup_22.png` mean 56.2 against `environment`'s 43; the frame reads as 19:00.
- **Over budget by declaration.** r1 declared 900 000 triangles and measured 996 288 — a hard fail on budget
  regardless of how the frame looks, and the gauntlet that would have caught it was never finished.
- **Boot-overlay frames.** `closeup_12.png` captured `#boot` (mean 20.3, `bootFrame: true`). A 900 ms synchronous-ish
  synthesis at init plus a slow SwiftShader first frame makes this likely; keep init ≤ 2.0 s and re-shoot any frame
  whose stats look like the overlay.
- **The volume-slider machine gun.** `ui` emits `ui:action {action:'setAudio'}` on every slider `input`; an unmapped
  action falling through to `ui_click` fires dozens of clicks per drag. Same class of bug: one `build_place` per
  building in a 200-building `buildings:changed`.
- **24 kHz.** Nothing above 12 kHz exists, so leaves, rain and UI transients are dull and "cheap" no matter how good
  the synthesis is — and a listener notices immediately even though no screenshot shows it.
- **Everything dry.** No reverb, no per-voice distance filtering: a bird at 300 m sounds exactly like a bird at 3 m,
  only quieter. r1 flagged this itself.
- **A mix model that cannot be tested.** The r1 model lives inside `computeMix(ctx)` and reads `ctx.camera`,
  `ctx.clock` and `ctx.world` directly, so no curve in it can be checked without a browser. Factor it into pure
  `mix.js`.
- **Single-ramp diurnal traffic.** `traffic = f.traffic × (1 − 0.6 × night)` has no rush hour; the city sounds the
  same at 08:00 and 14:00.
- **Zone-blind ambience.** Hovering a factory and hovering a park produce the same bed mix — the single biggest
  "this is not CS2" tell in the current build.
- **Tiling lattice** (terrain/simulation r1): one photo repeat over a large plane shows a regular diagonal
  cross-hatch at aerial and skyline, strongest at noon; a second rotated sample does not hide it.
- **Razor horizon** (environment r2, simulation r1): ground and sky meeting in a hard line because the distance fade
  never reaches 1.0.
- **Washed-out golden hour and blown 17:30** (effects r1 blocker): stacked exposure plus fog in-scatter; check the
  ≤ 1.5 %-over-245 rule before believing a frame looks warm.
- **Green static / lollipop foliage** (effects, simulation, ui r1): 8 % alpha-cut noise on a jittered blob is fine at
  400 m and obvious programmer art inside 40 m.
- **720p clipping** (ui r1, simulation r1): a ~1 050 px tall absolute panel loses its lower half at 1280×720. The
  critic always shoots one frame at 1280×720.
- **A context that never starts.** Chromium blocks `AudioContext` until a real user gesture; a synthetic
  `dispatchEvent` does not count. The live probe must use `page.mouse.click` on the Enable button and
  `--autoplay-policy=no-user-gesture-required`, and the module must keep its gesture listeners passive and remove
  them once running.
- **Clicks and zipper noise.** Setting `gain.value` directly instead of `setTargetAtTime`, or re-starting a bed source
  on a mix change, produces a click on every scenario switch. Beds start once, at `enable()`, and are only ramped.

## 7. Dependencies and their real APIs

`dependencies: []` — and it stays `[]`. `environment` is always present in a showcase (core forces it), everything
else is optional and must be reached through `?.` inside `try/catch`; the soundscape must keep running when it is
absent.

Core (`src/core/`, exact signatures — never guess):

- `ctx.rng` — `float()`, `range(min,max)`, `int(min,max)` *inclusive*, `bool(p)`, `pick(arr)`, `weighted([[v,w],…])`,
  `gauss()`, `shuffle(arr)`, `fork(label)`. The only randomness source; every catalogue entry renders from its own
  `rng.fork('synth/<name>')` and the scheduler from `rng.fork('scheduler')`.
- `ctx.clock` — `hour`, `day`, `speed`, `paused`, `dayLengthSeconds` (600), `set(hour)`, `setSpeed(n)`, `pause()`,
  `resume()`, `sunElevation(hour = this.hour)`, `sunAzimuth(hour)`, `isNight(hour)` (`sunElevation < −0.05`).
- `ctx.camera` — `camera` (PerspectiveCamera), `target` (Vector3), `distance`, `yaw`, `pitch`, `presets`,
  `apply(name | {position,target})`, `registerPreset(name, preset)`, `flyTo(preset, seconds)`, `enableControls(bool)`,
  `screenToGround(ndcX, ndcY)`. The camera-right vector on the ground plane is `(cos yaw, −sin yaw)`.
- `ctx.events` — `on(name, fn, owner)` → unsubscribe fn, `once`, `off`, `offOwner(owner)`, `emit(name, payload)`,
  `listenerCount(name)`. Always pass `'audio'` as `owner` so `dispose()` is clean.
- `ctx.assets` — `await pbr(name, {repeat:[u,v]})` → `{map, normalMap, roughnessMap, aoMap, …}`; `hdri(name)`;
  `gltf(url)`; `procedural.solid(hex,size)`, `procedural.noiseTexture(opts)`,
  `procedural.gradient({size,stops,horizontal,srgb})`, `procedural.noiseNormal({size,seed,scale,strength})`.
  Every loader resolves even on failure, with a procedural fallback and a `log.warn`. Albedo `SRGBColorSpace`;
  normal/roughness/AO linear.
- `ctx.engine` — `stats` (`{fps, frameMs, drawCalls, triangles, programs, textures}`), `onBeforeRender(fn)`,
  `onAfterRender(fn)`. Never `renderer.render`, never `setComposer`, never touch `toneMapping`/`scene.fog`.
- `ctx.log.info/warn/error`, `ctx.quality`, `ctx.headless`, `ctx.group` (your only scene parent), `ctx.world`.

Neighbours — call exactly these, degrade exactly as stated:

- `environment` (always present): read `world.weather.{rain, wind:{x,z,speed}, cloudiness, temperature, fogDensity,
  night?, skyLight, sunDir}` and listen to `weather:changed {cloudiness, rain, fogDensity}`. For any custom
  `ShaderMaterial` in the backdrop call `ctx.modules.environment?.setupMaterial(material)` and `hookScene()` once
  after staging so CSM and fog uniforms are wired. **Never** set `toneMapping`, `toneMappingExposure` or `scene.fog`.
  Degrade: `world.weather.night ?? (ctx.clock.isNight() ? 1 : 0)`, `wind.speed ?? 2`, `temperature ?? 18`.
- `traffic` (stub today): `world.traffic.vehicles` (Map), `world.traffic.stats.{count, avgSpeed, congestion}`.
  Degrade: derive the traffic factor from `world.buildings.items.size / 400`, then from the last
  `api.setAmbienceHint({traffic})` value (a scalar 0..1, §2.3), then 0. In `?showcase=audio` the hint is the live
  branch — §8 sets `traffic: 0.45` at load.
- `zoning` (stub today): `world.zones.cells` — `Map<"ix,iz", {x, z, type, density, edgeId, side, depth}>`,
  `cellSize: 8`, `types: ['residential','commercial','industrial','office']`. Degrade to `world.buildings.items`
  (`{x, z, type, density, …}`), then to the last `api.setAmbienceHint({zone})` blend, then to an all-zero zone mix.
  That is exactly the (a)/(b)/(c) order item 10 grades, and in `?showcase=audio` the graded branch is always (b),
  because this module stages neither zoning nor buildings.
- `buildings`: `world.buildings.items` — `Map<id, {id, lotId, type, density, level, footprint, floors, height, x, y,
  z, heading, styleId, occupants, jobs, lit}>` for positional `build_place` and for the zone fallback. Degrade: none
  needed; the Map is empty.
- `roads`: `world.roads.edges` (Map of `{id, a, b, type, lanes, width, length, …}`), `world.roads.types[t].speed`,
  `world.roads.sample(edgeId, t)`. Used only to place `car_pass`/`siren` on a real lane when roads exist; degrade to
  the r1 behaviour (a random bearing at 10–50 m from `camera.target`).
- `simulation`: `sim:milestone {level, name, unlocks, reward, population}` → `milestone` + duck;
  `world.economy.population` may bias the `crowd` bed. Degrade: 0.
- `ui`: **never imported.** `ui/panels.js` already calls `ctx.modules.audio.getMasterVolume()`, `isMuted()`,
  `setMasterVolume(v)` and `mute(on)` directly and emits `ui:action {action:'setAudio', args:['master'|'mute', v]}` —
  both paths must work and must not double-fire a sound (item 22). `ctx.modules.ui?.toast?.()` is allowed but must be
  optional-chained.
- `core/save.js` calls `api.serialize()` / `api.deserialize(data)` in registry dependency order; audio's payload is
  settings only (`{master, muted, bus}`) and must never carry buffers.
- `localStorage` under the key `simbuild.audio` for master/mute/bus, every access wrapped in `try/catch` (private mode
  throws). Settings persist; nothing else does.

## 8. Showcase

`showcase.description` names what is staged. `showcase.setup(ctx)` stages this and nothing else:

- **A park with a road**, ≤ 260 × 260 m of detailed ground: the bandstand at the `closeup`/`bandstand` target, the
  gravel ring and spur, benches, mown-stripe lawn with dirt patches and forest-floor darkening, the T-junction of two
  streets with wheel-track wear, gutter grime, double-yellow centre line, crosswalk, kerbs and slab sidewalks (all of
  which r1 got right — keep them), street and park lamps with night pools.
- **Ground beyond the park ≤ 700 m across**, fully faded into the fog/sky colour before its edge. The 1 400 m hill
  field and the far forested belt are the triangle budget; cut them until item 26 passes. Tree count is whatever fits
  ≤ 420 000 triangles with 3 CSM cascades — expect roughly 500–800 instances, not 2 000.
- **Two audible props that justify the beds in frame**: a small water feature or stream reach near the `grove` camera
  (justifies the `water` bed) and a service/industrial shed at the far end of the side street (justifies `industry`).
  Both instanced or merged; neither is allowed to cost more than ~15 000 triangles.
- **The audio panel** on `#audio-ui`, in simulated-transport mode when headless, live after a gesture otherwise.
- A deterministic scenario at load, and it is the **only** source of the zone mix in this showcase — nothing here
  stages zoning or buildings, so item 10's branch (b) is what every graded frame reads. Seed it explicitly, with the
  §2.3 six-key object, and re-seed it from the camera-preset handler so a `?camera=` change is applied before the
  first frame is captured:
  ```js
  api.setAmbienceHint({ traffic: 0.45,
    zone: { park: 0.62, residential: 0.26, commercial: 0.12 } });   // bandstand, closeup, grove, aerial, skyline
  api.setAmbienceHint({ traffic: 0.70,
    zone: { residential: 0.44, commercial: 0.34, park: 0.14, industrial: 0.08 } });   // junction, street
  ```
  Every camera preset falls in one of those two buckets — the park blend is the default and covers the four standard
  presets that look at the park (`aerial`, `skyline`, `closeup` and the module's `bandstand`/`grove`); the street
  blend is applied only for `junction` and the standard `street` preset.
  `hour` comes from `?time=`. `zoneMix()` therefore returns **`park` as its largest key at `bandstand`** (a
  park-dominant blend) and **`residential` as its largest key at `junction`** (the street-side blend that gives the
  traffic beds their context) — the two values item 10 and the item 20(d) "dominant zone" chip are graded against.

Declared `showcase.cameras` — exactly these three names; retune the numbers if a shot demands it, keep the intent:

```js
cameras: {
  bandstand: { yaw: 2.60, pitch: 0.24, distance:  70, target: [ 20, 4,  20] }, // panel left, bandstand + lamp pools
  junction:  { yaw: -0.50, pitch: 0.55, distance: 140, target: [-50, 0,  60] }, // the T-junction; traffic beds' context
  grove:     { yaw: 1.15, pitch: 0.16, distance:  55, target: [ 70, 3, -30] }, // night grove: pools, water, no lawn glow
}
```

How it must read at each standard camera × time. Critics shoot noon and night by default plus golden hour; the full
matrix is `aerial, street, skyline, closeup` × `06.5, 12, 17.5, 22`, plus the three presets at 12 and 22, plus one
`bandstand` frame at 1280×720, plus `--showcase all --camera aerial --time 12`.

| | 06.5 golden hour | 12 noon | 17.5 late afternoon | 22 night |
|---|---|---|---|---|
| **aerial** (520 m) | Long soft shadows across the lawn; ground warm and non-repeating (item 24) | Whole park legible, no lattice, horizon faded; panel chips read `aerial` zoom and a traffic-heavy far mix | Warm rim on the bandstand roof; no blown sky | Mean ≤ 46; lamp pools are the only light; crickets bed at ≥ 0.6 in the meters |
| **street** (60 m) | Rim-lit kerbs, contact AO at every lamp base, birds meter at its dawn peak | Slab and asphalt tone variation readable; nine bed meters and the 24 h timeline legible | Best light — keep r1's warm side light | Mean ≤ 54; ≥ 4 pools of L ≥ 110; no lamp head brighter than its pool |
| **skyline** (900 m) | Haze gradient, no razor horizon | ΔL ≤ 12 across the horizon; timeline "now" marker at 12:00 | ≤ 1.5 % blown pixels, mean ≤ 150 | Deep blue sky; the park a lit island; far mix dominated by `traffic_far` |
| **closeup** (110 m) | Bandstand roof highlights, bench and gravel detail | Materials hold at 20 m: no icosahedron facets, no alpha-cut static; spectrograms legible in the panel | Warm side light on the bandstand columns | Mean ≤ 54; emissive never brighter than its own pool |

Also required in the round's evidence, named in the build record: `selftest.json` (with `gridPoints: 7696`,
`distanceSteps` and `sunCurve`), `live.json` (with `voiceDrop` and `filter`), `imgstats.json` (with `stagedPct` per
shot), `apicheck.out.json`, `panel_12_720p.png`, and the `--showcase all` frame proving 0 draw calls, no panel, and
`errors: []`. All three probe scripts live in `src/modules/audio/`; only their output lives under `shots/audio/r<n>/`.
