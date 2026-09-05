#!/bin/bash
cd /home/user/SimBuild
S="node tools/screenshot.mjs --showcase environment --measure 1.5"
$S --camera street --time 17.5 --out shots/environment/r2/street_17p5.png
$S --camera skyline --time 17.5 --out shots/environment/r2/skyline_17p5.png
$S --camera street --time 22 --out shots/environment/r2/street_22.png
$S --camera sunset --time 12 --out shots/environment/r2/sunset_12.png
$S --camera sky --time 12 --out shots/environment/r2/sky_12.png
$S --camera sunrise --time 12 --out shots/environment/r2/sunrise_12.png
$S --camera moonrise --time 12 --out shots/environment/r2/moonrise_12.png
$S --camera sky --time 22 --out shots/environment/r2/sky_22.png
$S --camera moonrise --time 22 --out shots/environment/r2/moonrise_22.png
$S --camera sunset --time 17.9 --out shots/environment/r2/sunset_17p9.png
$S --camera sunrise --time 6.2 --out shots/environment/r2/sunrise_6p2.png
$S --camera street --time 12 --weather rain --out shots/environment/r2/street_12_rain.png
$S --camera skyline --time 12 --weather fog --out shots/environment/r2/skyline_12_fog.png
$S --camera skyline --time 12 --weather cloudy --out shots/environment/r2/skyline_12_cloudy.png
$S --camera aerial --time 12 --w 1280 --h 720 --out shots/environment/r2/aerial_12_720p.png
echo EXTRA_DONE
