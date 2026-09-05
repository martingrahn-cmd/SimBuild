#!/bin/bash
cd /home/user/SimBuild
until grep -q "EXTRA_DONE" shots/environment/r2/extra.log; do sleep 5; done
node tools/screenshot.mjs --showcase environment --measure 1.5 --camera sunrise --time 12 --out shots/environment/r2/sunrise_12.png
node shots/environment/r2/apicheck.mjs > shots/environment/r2/apicheck.log 2>&1; echo "apicheck exit $?"
node shots/environment/r2/imgstats.mjs shots/environment/r2/*.png > shots/environment/r2/imgstats.txt 2>&1
echo EXTRA2_DONE
