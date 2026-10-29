#!/bin/bash
# Gets the Firefox build of the current version signed by Mozilla (unlisted: not in their store) and keeps the .xpi in
# signed/ (gitignored). Mozilla signs each version only once, so an .xpi already in signed/ is reused.
# Needs site/build.sh run first, and the AMO API keys in /root/source/qmon/data/amo.env (AMO_JWT_ISSUER, AMO_JWT_SECRET).
set -e
cd "$(dirname "$0")/.."
VERSION=$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' extension/manifest.json)
XPI=signed/otsm-banner-$VERSION.xpi
[ -f "$XPI" ] && { echo "$XPI (already signed)"; exit 0; }
mkdir -p signed tmp-sign
docker run --rm --env-file /root/source/qmon/data/amo.env -v "$PWD/dist:/d:ro" -v "$PWD/tmp-sign:/out" node:20-alpine sh -c \
  "mkdir /x && cd /x && unzip -q /d/otsm-banner-$VERSION-firefox.zip && npx -y web-ext@8 sign --channel=unlisted --source-dir /x \
   --artifacts-dir /out --api-key \"\$AMO_JWT_ISSUER\" --api-secret \"\$AMO_JWT_SECRET\" --approval-timeout 900000" 2>&1 | grep -E "^(Signed|Error|Waiting)|error" || true
f=$(ls tmp-sign/*-"$VERSION".xpi 2>/dev/null | head -1)
[ -n "$f" ] || { echo "signing failed"; rm -rf tmp-sign; exit 1; }
mv "$f" "$XPI"; rm -rf tmp-sign
echo "$XPI"
