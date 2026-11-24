#!/bin/bash
# Copies the extension to Trevor's OneDrive share (/mnt/qmon-share/otsm-banner), which he loads unpacked in his browser:
# after each test build he only clicks Reload on the extensions page.
set -e
cd "$(dirname "$0")"
DEST=/mnt/qmon-share/otsm-banner
VERSION=$(python3 -c "import json; print(json.load(open('extension/manifest.json'))['version'])")
mountpoint -q /mnt/qmon-share || ls /mnt/qmon-share >/dev/null    # wake the automount
rsync -r --delete --checksum extension/ "$DEST/"
diff -r extension "$DEST" && echo "$DEST now holds $VERSION"
