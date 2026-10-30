#!/bin/bash
# Builds dist/ (site/build.sh) and uploads it to trevman.com/otsm-banner (ssh tsanford@trevman.com, phoenix's key;
# files in ~/www/trevman/otsm-banner), with the signed Firefox .xpi (site/sign-firefox.sh). The host sometimes drops a new
# connection straight away, so each step retries.
set -e
cd "$(dirname "$0")/.."
site/build.sh
site/sign-firefox.sh
VERSION=$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' extension/manifest.json)
cp "signed/otsm-banner-$VERSION.xpi" dist/
mkdir -p store/upload && mv dist/*-chrome-store.zip store/upload/   # for the Chrome Web Store dashboard
rm -f dist/*-firefox.zip   # only for signing
# Firefox checks this for new versions (update_url in the Firefox manifest)
cat > dist/updates.json <<JSON
{ "addons": { "otsm-banner@trevman.com": { "updates": [
  { "version": "$VERSION", "update_link": "https://trevman.com/otsm-banner/otsm-banner-$VERSION.xpi" }
] } } }
JSON
cp site/htaccess dist/.htaccess   # .xpi as application/x-xpinstall, so Firefox offers to install it
DIR=www/trevman/otsm-banner
retry() { for i in 1 2 3 4 5; do "$@" && return 0; sleep 5; done; return 1; }
upload() { tar cf - -C dist . | ssh -o BatchMode=yes tsanford@trevman.com "mkdir -p $DIR && cd $DIR && tar xf - && chmod 755 . img && chmod 644 .htaccess index.html privacy.html updates.json img/* *.zip *.xpi"; }
retry upload
for f in $(cd dist && find . -type f ! -name .htaccess | sed 's|^\./||'); do
  [ "$(curl -s "https://trevman.com/otsm-banner/$f" | md5sum)" = "$(md5sum < "dist/$f")" ] || { echo "MISMATCH $f"; exit 1; }
done
echo "https://trevman.com/otsm-banner/ is up to date"
