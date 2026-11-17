#!/bin/bash
# Nightly PostgreSQL backup (run from root cron). Keeps 14 days.
set -euo pipefail

DEST=/var/backups/aina
FILE="$DEST/aina-$(date +%Y%m%d-%H%M%S).dump"

install -d -m 700 "$DEST"
sudo -u postgres pg_dump -Fc aina > "$FILE"
pg_restore --list "$FILE" > /dev/null
sha256sum "$FILE" > "$FILE.sha256"
chmod 600 "$FILE" "$FILE.sha256"

find "$DEST" -name 'aina-*.dump*' -mtime +14 -delete
