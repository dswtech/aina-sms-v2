#!/bin/bash
# Usage: deploy.sh <tag-or-sha>   (run on the VPS as the deploy user)
# Builds a release under /var/www/aina/releases and switches `current`.
# Does NOT run migrations (ADR 006: schema changes need operator authorization).
set -euo pipefail

REF="${1:?usage: deploy.sh <tag-or-sha>}"
APP=/var/www/aina
REPO=https://github.com/dswtech/aina-sms-v2.git
DIR="$APP/releases/$(date +%Y%m%d%H%M%S)-${REF//[^A-Za-z0-9._-]/_}"

[ -f "$APP/shared/.env" ] || { echo "missing $APP/shared/.env" >&2; exit 1; }

git clone --quiet "$REPO" "$DIR"
git -C "$DIR" checkout --quiet "$REF"

cd "$DIR"
composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader --no-progress
corepack pnpm install --frozen-lockfile
corepack pnpm run build
rm -rf node_modules

ln -s "$APP/shared/.env" .env
rm -rf storage && ln -s "$APP/shared/storage" storage
mkdir -p bootstrap/cache && chmod -R g+w bootstrap/cache && sudo chgrp -R www-data bootstrap/cache

php artisan optimize

ln -sfn "$DIR" "$APP/current"
sudo systemctl reload php8.5-fpm
sudo systemctl restart aina-queue aina-scheduler

# Tell users about the new version; a failure here must not fail the deploy.
php artisan release:announce || echo "warning: release:announce failed; deploy continues" >&2

# keep the 5 newest releases
ls -1dt "$APP"/releases/*/ | tail -n +6 | xargs -r rm -rf

echo "deployed $REF -> $DIR"
