#!/bin/bash
# roads r2 verification matrix with a 240 s timeout per shot (gauntlet.mjs hard-codes 90 s, which fails under load).
cd /home/user/SimBuild
LOG=shots/roads/dev2/matrix.log
shoot() { # showcase camera time out
  local out=$4
  if [ -f "${out%.png}.json" ] && [ -f "$out" ] && grep -q '"ok": true' "${out%.png}.json" && grep -q '"errors": \[\]' "${out%.png}.json"; then echo "SKIP $out" >> $LOG; return; fi
  node tools/screenshot.mjs --showcase $1 --camera $2 --time $3 --measure 1.5 --timeout 240 --out $out >> $LOG 2>&1
}
for cam in street skyline closeup; do for t in 6.5 12 17.5 22; do shoot roads $cam $t shots/roads/rdev2/${cam}_${t/./p}.png; done; done
for p in intersection bridge highway loop merge corner kerb armtop coastwest; do shoot roads $p 12 shots/roads/rdev2/${p}_12.png; done
for p in intersection bridge; do shoot roads $p 22 shots/roads/rdev2/${p}_22.png; done
node tools/screenshot.mjs --showcase all --camera aerial --time 12 --timeout 240 --out shots/roads/dev2/all_aerial_12.png >> $LOG 2>&1
echo DONE > shots/roads/dev2/chain_i.done
