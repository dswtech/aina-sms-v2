#!/bin/bash
# Forced command for the CI deploy key (authorized_keys `command=`).
# Accepts only a full commit SHA and refuses to run two deploys at once.
set -euo pipefail

ref="${SSH_ORIGINAL_COMMAND:-}"
[[ "$ref" =~ ^[a-f0-9]{40}$ ]] || { echo "refused: expected a 40-character commit SHA" >&2; exit 1; }

exec flock -n /var/www/aina/.deploy.lock /var/www/aina/deploy.sh "$ref"
