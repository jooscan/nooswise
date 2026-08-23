#!/usr/bin/env bash
#
# Dump the database and copy it to the GCS bucket.
#
#   bash deploy/backup.sh [--label some-label]
#
# Run nightly from cron (see deploy/README.md). Cloud SQL did this for you; on a
# self-hosted VM it is your job, and an untested backup is not a backup — see
# deploy/restore.sh.
set -euo pipefail

cd "$(dirname "$0")/.."
COMPOSE="docker compose -f docker-compose.prod.yml"

LABEL="nightly"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --label) LABEL="$2"; shift 2 ;;
    *) echo "Unknown argument: $1" >&2; exit 1 ;;
  esac
done

set -a; source .env; set +a

: "${POSTGRES_USER:?missing in .env}"
: "${POSTGRES_DB:?missing in .env}"
: "${BACKUP_BUCKET:?missing in .env}"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="nooswise-${STAMP}-${LABEL}.sql.gz"
LOCAL="/tmp/${FILE}"

echo "==> Dumping ${POSTGRES_DB}"
# --clean --if-exists so the dump can be restored over an existing database.
$COMPOSE exec -T db pg_dump \
  --username="$POSTGRES_USER" \
  --dbname="$POSTGRES_DB" \
  --clean --if-exists --no-owner --no-privileges \
  | gzip -9 > "$LOCAL"

SIZE="$(du -h "$LOCAL" | cut -f1)"

# A dump of an empty or failed database still produces a small valid gzip, so check
# that the schema actually made it in rather than trusting the exit code alone.
if ! gzip -dc "$LOCAL" | grep -q 'CREATE TABLE public.groups'; then
  echo "Dump does not contain the expected schema. Not uploading." >&2
  rm -f "$LOCAL"
  exit 1
fi

echo "==> Uploading ${FILE} (${SIZE})"
gcloud storage cp "$LOCAL" "gs://${BACKUP_BUCKET}/${FILE}" --quiet

rm -f "$LOCAL"
echo "Backup complete: gs://${BACKUP_BUCKET}/${FILE}"
