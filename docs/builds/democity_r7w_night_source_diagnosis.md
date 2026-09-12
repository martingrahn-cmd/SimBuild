# Democity r7w night-source diagnosis — no production change

r7w measures the remaining wide-night bright-source failure before changing an emissive owner. Fresh frozen 1920×1080 Metal pages retain every geometry owner and disable only one real emission path at a time. At the prescribed 480 px scale, aerial baseline is 0.5185% above luminance 180. Disabling services lowers it to 0.4931%; props lowers it to 0.5177%; traffic has no measured effect. Skyline baseline is 0.5216%; services lowers it to 0.5139%, while props and traffic have no measured effect.

The first buildings diagnostic removed the emissive texture and changed the compiled shader variant, producing invalid white facades. It was rejected and replaced with the buildings owner's existing `setLit(0)` control. With building lighting near zero, aerial and skyline bright fractions remain exactly 0.5185% and 0.5216%. Building lighting does affect mean and median scene luminance, but its wide-view panes do not cross the criterion's 180 threshold.

The existing building shader intentionally fades distant window emission to 7% beyond 300 m. Two temporary upper-bound trials raised only that far floor to 12% and 25%, without changing baked window count, occupancy, tint or near brightness. Neither changes either wide-view bright fraction at all. Both are rejected and the 7% production value is restored.

This evidence rules out another scalar emissive adjustment as a verified fix. The failed fraction is dominated by sparse real bright objects at the current city scale, with only a small service contribution. Closing it needs more real occupied frontage and light-bearing structures, or a better criterion grounded in visible source clusters; global exposure, lamp enlargement and window intensity inflation remain unjustified. Democity remains **6.0 FAIL**.

Evidence: `shots/democity/r7w-night-source/`, `shots/democity/r7w-window-floor-12/`, `shots/democity/r7w-window-floor-25/`.
