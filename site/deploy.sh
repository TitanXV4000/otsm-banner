#!/bin/bash
# Builds dist/ (site/build.sh) and uploads it to trevman.com/otsm-banner (ssh tsanford@trevman.com, phoenix's key;
# files in ~/www/trevman/otsm-banner). The host sometimes drops a new connection straight away, so each step retries.
set -e
cd "$(dirname "$0")/.."
site/build.sh
DIR=www/trevman/otsm-banner
retry() { for i in 1 2 3 4 5; do "$@" && return 0; sleep 5; done; return 1; }
upload() { tar cf - -C dist . | ssh -o BatchMode=yes tsanford@trevman.com "mkdir -p $DIR && cd $DIR && tar xf - && chmod 755 . img && chmod 644 index.html img/* *.zip"; }
retry upload
for f in $(cd dist && find . -type f | sed 's|^\./||'); do
  [ "$(curl -s "https://trevman.com/otsm-banner/$f" | md5sum)" = "$(md5sum < "dist/$f")" ] || { echo "MISMATCH $f"; exit 1; }
done
echo "https://trevman.com/otsm-banner/ is up to date"
