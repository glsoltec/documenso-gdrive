#!/bin/bash
set -euo pipefail

# Automated PostgreSQL backup for Documenso.
# Schedule via crontab: 0 2 * * * /opt/documenso/scripts/backup.sh
#
# Reads credentials from the same docker-compose .env as documenso.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Backups live here.
BACKUP_DIR="${BACKUP_DIR:-/opt/documenso/backups}"
# How many daily backups to keep.
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

# ------------------------------------------------------------------------------
# Resolve PG connection from docker-compose .env next to this script.
# ------------------------------------------------------------------------------
ENV_FILE="${DOCUMENSO_ENV_FILE:-$(dirname "$SCRIPT_DIR")/.env}"

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: env file not found at $ENV_FILE" >&2
  exit 1
fi

load_env() {
  local key="$1"
  # shellcheck disable=SC2046
  export "$key=$(
    grep -E "^${key}=" "$ENV_FILE" | tail -1 | sed -E 's/^[^=]+=//' | tr -d '"' | tr -d "'"
  )"
}

load_env 'POSTGRES_USER'
load_env 'POSTGRES_PASSWORD'
load_env 'POSTGRES_DB'

PGHOST="${PGHOST:-postgres}"
PGPORT="${PGPORT:-5432}"
export PGPASSWORD="$POSTGRES_PASSWORD"

# ------------------------------------------------------------------------------
# Ensure backup directory exists.
# ------------------------------------------------------------------------------
mkdir -p "$BACKUP_DIR"

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
FILE="${BACKUP_DIR}/documenso-${TIMESTAMP}.sql.gz"

echo "[$(date -Iseconds)] Starting Documenso backup → $FILE"

pg_dump \
  -h "$PGHOST" -p "$PGPORT" \
  -U "$POSTGRES_USER" \
  -d "$POSTGRES_DB" \
  --no-owner --no-acl \
  | gzip > "$FILE"

echo "[$(date -Iseconds)] Backup complete ($(du -h "$FILE" | cut -f1))"

# ------------------------------------------------------------------------------
# Rotate old backups.
# ------------------------------------------------------------------------------
find "$BACKUP_DIR" -name 'documenso-*.sql.gz' -mtime "+${RETENTION_DAYS}" -delete -printf '[rotate] deleted %p\n'
