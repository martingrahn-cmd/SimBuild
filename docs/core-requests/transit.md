# Transit integration requests — round 2

Transit owns one deterministic fleet. The existing traffic `spawnVehicle` API is not a managed vehicle capability: it does not accept externally prescribed pose, door state, timetable, line livery and collision reservation together. Wrapping it would duplicate or independently advance buses. Current `stats().source` is honestly `own`; transit never writes traffic or props records.

## Native line tool adapter

Root has accepted this seam and is preparing the consumer change externally for the wave 3 integrator. No neighboring source was changed by this builder.

Call `beginLine({mode:'line',kind:'bus',lineId?})` when beginning a new line or editing an existing line. Repeated calls for the same intent preserve the private draft. Forward canvas clicks to `addStopToDraft(x,z)`, Enter to `commitLine()`, and Escape or stationary right click to `cancelLine()`. A right drag remains a camera gesture. All calls are synchronous. A failed commit returns null and keeps the draft; success returns the committed integer line ID. Calling cancel after success leaves the committed line intact. No fixed line construction fee is charged by transit.

`draftState()` returns a fresh snapshot:

```js
{
  active, mode: 'line', kind: 'bus', lineId: null | integer,
  stops: [{id, name, x, y, z, heading, edgeId, t, side, lines, waiting, propId}],
  valid, reason, length, route: [edgeId],
  hovered: null | {x, y, z, heading, edgeId, t, side, valid, reason, ...stopFields}
}
```

`previewDraft(x,z)` changes only private hover and returns that snapshot. Nonfinite values, including null/null, clear hover. The draft's valid/reason refer to the committed candidate stop sequence. Transit renders its valid private return route as a yellow ribbon; tools can add numbered markers and the snapped hover marker. Native adapters must not infer straight terrain links from edge IDs.

New draft stop IDs are reserved privately. Cancel may leave sequence gaps but leaves world maps, their records and world version unchanged. Commit validates every directed leg including last to first before publishing any new stops. One `transit:changed` event follows each successful batch.

Public `addStop(x,z,{name,edgeId?,side?,mode:'bus'})` returns integer or null. Stops snap within 60 metres to a street/avenue/alley frontage, at least trim plus 8 metres from endpoints. Right uses the a to b direction; left uses b to a and is rejected on a one-way edge. `createLine('bus',stopIds,{name,color,vehicles,fare})` accepts at least two distinct stops without a repeated first stop. It includes the directed return leg. `route(lineId)` returns a defensive copy of the ordered road edge IDs. Public headings use the architecture convention of zero north, increasing clockwise.

## Traffic and road transitions

Buses follow authoritative lane centres between junctions and dwell for eight game seconds. Transit now caches continuous cubic connectors between trimmed lane endpoints. Public vehicle poses have `junction: true` inside these connectors because the roads API exposes no interior junction lane path; a single `laneCenter(edgeId, lane, t)` cannot represent the physical turn. Outside connectors, `junction` is false and the lane pose remains authoritative. The trajectory is still a pure function of game hour. The actual road fixture has zero endpoint discontinuity, and its temporal boundary test samples immediately before and after every cached segment.

`stats().meanSpeed` uses travelled physical arc divided by the full circuit duration, including dwell. `stats().routeArcLengths[lineId]` exposes that arc. Public `line.length` retains the specified full road edge sum, while runtime `headway` is actual circuit duration divided by allocated buses. The showcase's rounded corners shorten physical arc by about 1.5 to 1.8 percent relative to the full edge sum; this small distinction is explicit rather than adjusting reported speed to conceal it. Runtime zero-fleet headway is Infinity; serialized headway is null and deserialize recomputes it.

Buses can still overlap independently simulated cars. A complete traffic owner seam should accept a read-only schedule/pose provider, dimensions and occupancy reservation, preserve deterministic time evaluation, and provide a collision strategy. A highest-surface ray alone cannot identify a lane on a stacked junction.

## Economy and passenger semantics

Daily ridership is an estimate from actual `simulation.building(id).occupants` and `.jobs`, or the same public world building fields if simulation is absent. Missing people and explicit zero occupancy both contribute zero; capacity is never substituted for people. A bounded undirected pavement Dijkstra selects buildings within 400 metres of road walking distance plus their road access offset. Each building contributes once per line. The catchment is cached separately from demand and invalidated by roads, stops or buildings changes. Every twentieth `sim:tick` refreshes demand from those cached IDs; changes increment `world.transit.version` and emit one completed event batch, without rebuilding the fleet or spatial routes.

Only an isolated `world.flags.showcase === 'transit'` scene with no buildings uses declared seeded showcase stop weights. Empty real cities cannot receive that fallback. Daily ridership remains fixed across the hour; cumulative boardings retains its time-of-day curve. Vehicle and aggregate occupancy are fractions from zero to one, with `riders` carrying the separate instantaneous integer count.

The authoritative owner forecast remains `balance = 30 * (ridership * fare - vehicles * 900)` in cents. Allocated vehicles cost money even when a line is inactive, while inactive ridership is zero. A simulation consumer may derive `dailyFareRevenue = ridership * fare` and `dailyOperatingCost = dailyFareRevenue - balance / 30` from public line records, cached on transit version. This avoids copying transit's cost constant. Integration must accrue these once through simulation's own time step and preserve cash through pause, events and save/load; transit itself never changes treasury. Root is preparing this integration after owner freeze. The demand model is a bounded forecast, not individual pedestrian boarding.

## HUD

The existing line panel already reads `world.transit`; the builder never installs sample HUD data. Root found the synchronous transitLines open/toggle race and is preparing the UI fix externally. The 720p panel clips some lower controls inside its scrollable body; the fixed footer remains present.

## Spec reconciliation

The literal ribbon height of sample.y + 0.02 lies below the actual asphalt deck at sample.y + 0.08. Transit uses sample.y + 0.095 with polygon offset, an explicit 0.075 metre deviation from the old literal. Showcase camera eye heights follow the graded road datum at 15 metres. Bus and stop close cameras follow actual landmarks because the fixed central targets contain no scheduled boarding location in this round. Chips now use one geometry glyph batch and camera-facing `chip:<id>` AABB proxies, with no DOM or new textures. Directional chevrons, white stop rings, bus headlight pools and owned shelter light strips are present. R3 now has a hollow bus cabin, real seat geometry and transparent glazing. Collision coordination, richer interiors and tram remain future work. The overlay camera now frames the near interchange from 180 metres above the road datum, so actual chips can be inspected within their 260 metre culling range; the line and aerial presets retain wider context. Clock.set(24) wraps to zero; cumulative boardings are defined on [0,24), so a literal midnight=day-total test would be contradictory.

## Legacy save migration accepted by integrator

Root found that the actual earned 404-resident pre-wave-3 save contains `modules.transit = {}`. The previous stub wrote precisely this shape. The builder therefore treats an exact plain empty object as a successful restore to empty line and stop Maps, preserving section identity and monotonically increasing ID sequences. This deliberately supersedes the old spec clause requiring `{}` rejection. Null and malformed nonempty payloads still return false without modifying current transit. This prevents an old city save from inheriting outgoing showcase lines.

## R3 visual handoff and stop boundary

The r3 owner changes are limited to bus and shelter rendering and showcase framing. Graph schedules, actual population demand, public drafts and save migration are unchanged. Paint roughness is 0.38; four subdued base pigments, real wheel openings and hubs, transparent glazing with warm, cool and dark window bays are present. Tyres, basic cabin structure and lamps remain in the far fleet. The 180 metre LOD removes secondary detail and separate door panels; a raw 179/181 metre image comparison is confounded by moving traffic and camera parallax, so it does not establish a pure LOD pass or failure.

Shelter timetable lines and flag numbers are merged geometry. A small emissive material contribution on the bench and timetable approximates the roof lamp's local bounce without adding lights. This is not physically traced illumination. The bus body and opaque structural batch cast shadows; glass, lamps and separate door/detail batches still do not all satisfy the literal shadow flag clause. Some night body panels remain too bright relative to windows. These are retained quality limits, not score exemptions.

Close cameras select existing clear frontages and project whole bus bounds against the open HUD, without moving or hiding props. A narrow foreground pole may still overlap a bus and ambient traffic can pass through a view. The current r3 source is snapshotted exactly under shots/transit/r3/source/ before result publication. Per the user's stop boundary, no r4 or new development scope begins after this report; the root integrator completes its existing native and fiscal checks and persists the handoff.

## Integrator decision (wave 3 final, 2026-09-08)

Applied native draft tool/hover/numbered markers, Enter/cancel/right-drag guards, line panel race/unlock fixes and real fiscal adapter. Retained exact-empty-object legacy migration, one owner fleet and actual public stop/line signatures. Rejected a spawnVehicle-only fleet wrapper because it would independently advance/duplicate buses; use current own fleet until managed pose/reservation API exists. Deferred collision coordination, tram and remaining art failures. Demand/forecast recomputation on restore is explicitly retained as a continuity limitation, not a money/route corruption claim. See `docs/critic/integration_w3.md` for final checks and open issues. The user requested a checkpoint and pause; no new round is authorized.
