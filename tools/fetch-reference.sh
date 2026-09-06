#!/usr/bin/env bash
# Re-fetch the Cities: Skylines II reference screenshots the critics calibrate against.
# They are NOT in the repo (asset policy: no copyrighted game assets) and they do not survive a new container,
# so this must be run once per fresh environment. Default target is the documented $REF fallback.
set -euo pipefail
DEST="${SIMBUILD_REF:-$HOME/.simbuild/ref}"
mkdir -p "$DEST"
if [ -f "$DEST/cs2_1.jpg" ]; then echo "reference images already present in $DEST"; exit 0; fi
echo "fetching CS2 store screenshots (app 949230) to $DEST"
curl -sS "https://store.steampowered.com/api/appdetails?appids=949230" \
  | python3 -c "import json,sys;[print(s['path_full']) for s in json.load(sys.stdin)['949230']['data']['screenshots']]" \
  > "$DEST/urls.txt"
i=0
while read -r u; do i=$((i+1)); curl -sS -o "$DEST/cs2_$i.jpg" "$u"; done < "$DEST/urls.txt"
echo "fetched $i images to $DEST"
echo "point agents at it with:  export SIMBUILD_REF=$DEST"
