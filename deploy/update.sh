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

set -a; source .env; set +a

echo "==> Pulling latest code"
git pull --ff-only

# This script just rewrote itself on disk. bash does not guarantee it re-reads a
# running script from disk after an external change, so without this re-exec the
# rest of THIS run can execute a stale mix of old and new content — which is exactly
# what happened the first time this shipped: git pull succeeded, but everything after
# it kept running the pre-fix logic anyway. Re-exec once into a fresh process that
# reads the file fresh from the start, then every step below is guaranteed current.
if [[ "${NOOSWISE_REEXECED:-}" != "1" ]]; then
  export NOOSWISE_REEXECED=1
  exec bash "$0" "$@"
fi

TAG="$(git rev-parse --short HEAD)"
export NOOSWISE_TAG="$TAG"
echo "==> Deploying $TAG"

echo "==> Building app image"
$COMPOSE build app

# Db has to be up before the safety dump can run against it. On a first-ever deploy
# this brings up an empty database and backs up essentially nothing — that's fine, the
# point is to never migrate against an unbacked-up *existing* database.
echo "==> Ensuring database is up"
$COMPOSE up -d db
$COMPOSE exec -T db sh -c 'until pg_isready -q; do sleep 1; done'

# On the very first deploy nothing has been migrated yet, so there's no schema and no
# data to protect — and backup.sh would refuse to upload that dump anyway, since it
# checks for the groups table as a sanity check that a dump is real. Every deploy after
# this one finds the table and takes the safety dump as normal.
if $COMPOSE exec -T db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -tAc \
     "select to_regclass('public.groups') is not null" 2>/dev/null | grep -q t; then
  echo "==> Taking a safety dump before migrating"
  # Migrations are forward-only. If one is destructive and wrong, this is what saves you.
  bash deploy/backup.sh --label "pre-deploy-$TAG" || {
    echo "Backup failed. Refusing to migrate without one." >&2
    exit 1
  }
else
  echo "==> No existing schema yet — first deploy, nothing to back up"
fi

echo "==> Running migrations"
# A one-shot container on the new image, so the schema always matches the code about
# to serve traffic. Fails the deploy rather than starting a half-migrated app.
$COMPOSE run --rm --no-deps app node dist/migrate.cjs

echo "==> Restarting app"
$COMPOSE up -d app cloudflared

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
