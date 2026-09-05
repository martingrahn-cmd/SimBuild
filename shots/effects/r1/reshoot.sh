#!/bin/bash
cd /home/user/SimBuild
echo "== apicheck start $(date)"
echo skip-apicheck
for s in aerial_6.5 street_6.5 street_12 street_17.5 skyline_6.5 skyline_12 skyline_22 closeup_6.5 closeup_12 closeup_17.5 closeup_22; do
  cam=${s%_*}; t=${s#*_}; out=shots/effects/r1/${cam}_${t/./p}.png
  for try in 1 2; do
    node tools/screenshot.mjs --showcase effects --camera $cam --time $t --timeout 300 --url http://127.0.0.1:5174 --measure 1.5 --out $out && break
    echo "retry $s"
  done
done
node tools/screenshot.mjs --showcase effects --camera lamps --time 12 --timeout 300 --url http://127.0.0.1:5174 --measure 1.5 --out shots/effects/r1/lamps_12.png
node tools/screenshot.mjs --showcase effects --camera lamps --time 22 --timeout 300 --url http://127.0.0.1:5174 --measure 1.5 --out shots/effects/r1/lamps_22.png
node tools/screenshot.mjs --showcase effects --camera plaza --time 12 --timeout 300 --url http://127.0.0.1:5174 --measure 1.5 --out shots/effects/r1/plaza_12.png
node tools/screenshot.mjs --showcase effects --camera plaza --time 22 --timeout 300 --url http://127.0.0.1:5174 --measure 1.5 --out shots/effects/r1/plaza_22.png
node tools/screenshot.mjs --showcase effects --camera street --time 12 --timeout 300 --url http://127.0.0.1:5174 --measure 1.5 --w 1280 --h 720 --out shots/effects/r1/street_12_720p.png
echo "RESHOOT DONE $(date)"
