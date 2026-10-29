#!/bin/bash
# Builds the web page for trevman.com/otsm-banner into dist/ (gitignored): index.html with the version and date
# filled in, the screenshots, and otsm-banner-<version>.zip (the extension, in an otsm-banner folder).
# Screenshots: test/demo.js (sample data only). Upload everything in dist/ to the otsm-banner folder on trevman.com.
set -e
cd "$(dirname "$0")/.."
VERSION=$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' extension/manifest.json)
DATE=$(date -d "@$(git log -1 --format=%ct -- extension)" '+%B %-d, %Y')
rm -rf dist && mkdir -p dist/img tmp-zip/otsm-banner
cp extension/* tmp-zip/otsm-banner/
(cd tmp-zip && zip -qr "../dist/otsm-banner-$VERSION.zip" otsm-banner)
rm -rf tmp-zip
cp site/img/*.png dist/img/
sed -e "s/@VERSION@/$VERSION/g" -e "s/@DATE@/$DATE/g" site/index.html > dist/index.html
echo "dist/: index.html, img/, otsm-banner-$VERSION.zip ($DATE)"
