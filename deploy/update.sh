#!/usr/bin/env bash
#
# Deploy the current commit. Run from the repo root on the VM.
#
#   bash deploy/update.sh
#
# Pulls, rebuilds the app image, runs migrations, then restarts only the app.
# Postgres and its volume are never touched.
set -euo pipefail

cd "$(dirname "$0")/.."
COMPOSE="docker compose -f docker-compose.prod.yml"

if [[ ! -f .env ]]; then
  echo "No .env found. Copy .env.production.example to .env and fill it in." >&2
  exit 1
fi

echo "==> Pulling latest code"
git pull --ff-only

TAG="$(git rev-parse --short HEAD)"
export NOOSWISE_TAG="$TAG"
echo "==> Deploying $TAG"

echo "==> Taking a safety dump before migrating"
# Migrations are forward-only. If one is destructive and wrong, this is what saves you.
bash deploy/backup.sh --label "pre-deploy-$TAG" || {
  echo "Backup failed. Refusing to migrate without one." >&2
  exit 1
}

echo "==> Building app image"
$COMPOSE build app

echo "==> Ensuring database is up"
$COMPOSE up -d db
$COMPOSE exec -T db sh -c 'until pg_isready -q; do sleep 1; done'

echo "==> Running migrations"
# A one-shot container on the new image, so the schema always matches the code about
# to serve traffic. Fails the deploy rather than starting a half-migrated app.
$COMPOSE run --rm --no-deps app node dist/migrate.cjs

echo "==> Restarting app"
$COMPOSE up -d app caddy

echo "==> Waiting for health"
for i in $(seq 1 30); do
  if $COMPOSE exec -T app node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" 2>/dev/null; then
    echo "Healthy. Deployed $TAG."
    $COMPOSE ps
    exit 0
  fi
  sleep 2
done

echo "App did not become healthy. Recent logs:" >&2
$COMPOSE logs --tail=50 app >&2
exit 1
