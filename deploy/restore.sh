#!/usr/bin/env bash
#
# Restore a backup. Defaults to a scratch database so you can rehearse safely.
#
#   bash deploy/restore.sh --list
#   bash deploy/restore.sh --file nooswise-20260823T000000Z-nightly.sql.gz
#   bash deploy/restore.sh --file <name> --into-production     # destructive
#
# Rehearse this once immediately after your first backup. A backup you have never
# restored is a guess.
set -euo pipefail

cd "$(dirname "$0")/.."
COMPOSE="docker compose -f docker-compose.prod.yml"

set -a; source .env; set +a
: "${POSTGRES_USER:?missing in .env}"
: "${POSTGRES_DB:?missing in .env}"
: "${BACKUP_BUCKET:?missing in .env}"

FILE=""
TARGET_DB="nooswise_restore_check"
PRODUCTION=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --list)
      gcloud storage ls "gs://${BACKUP_BUCKET}/" | sort
      exit 0 ;;
    --file) FILE="$2"; shift 2 ;;
    --into-production) PRODUCTION=1; TARGET_DB="$POSTGRES_DB"; shift ;;
    *) echo "Unknown argument: $1" >&2; exit 1 ;;
  esac
done

if [[ -z "$FILE" ]]; then
  echo "Pass --file <name>, or --list to see what is in the bucket." >&2
  exit 1
fi

if [[ $PRODUCTION -eq 1 ]]; then
  echo "This will OVERWRITE the live database '${POSTGRES_DB}'."
  read -r -p "Type the database name to confirm: " CONFIRM
  [[ "$CONFIRM" == "$POSTGRES_DB" ]] || { echo "Aborted."; exit 1; }
fi

LOCAL="/tmp/${FILE}"
echo "==> Fetching ${FILE}"
gcloud storage cp "gs://${BACKUP_BUCKET}/${FILE}" "$LOCAL" --quiet

if [[ $PRODUCTION -eq 0 ]]; then
  echo "==> Recreating scratch database ${TARGET_DB}"
  $COMPOSE exec -T db psql -U "$POSTGRES_USER" -d postgres \
    -c "DROP DATABASE IF EXISTS ${TARGET_DB};" -c "CREATE DATABASE ${TARGET_DB};"
fi

echo "==> Restoring into ${TARGET_DB}"
gzip -dc "$LOCAL" | $COMPOSE exec -T db psql -U "$POSTGRES_USER" -d "$TARGET_DB" -q

echo "==> Row counts in ${TARGET_DB}"
$COMPOSE exec -T db psql -U "$POSTGRES_USER" -d "$TARGET_DB" -c "
  select 'groups' as table, count(*) from groups
  union all select 'members', count(*) from members
  union all select 'expenses', count(*) from expenses
  union all select 'expense_splits', count(*) from expense_splits
  union all select 'settlements', count(*) from settlements;"

echo "==> Checking the money invariant survived the round trip"
$COMPOSE exec -T db psql -U "$POSTGRES_USER" -d "$TARGET_DB" -tAc "
  select case when count(*) = 0
              then 'OK: every expense equals the sum of its splits'
              else 'MISMATCH on ' || count(*) || ' expense(s)' end
  from (
    select e.id from expenses e
    join expense_splits s on s.expense_id = e.id
    group by e.id, e.amount_minor
    having e.amount_minor <> sum(s.amount_minor)
  ) bad;"

rm -f "$LOCAL"

if [[ $PRODUCTION -eq 0 ]]; then
  echo
  echo "Restored into the scratch database '${TARGET_DB}', leaving production untouched."
  echo "Drop it when you are done:"
  echo "  $COMPOSE exec -T db psql -U $POSTGRES_USER -d postgres -c 'DROP DATABASE ${TARGET_DB};'"
fi
