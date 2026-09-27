#!/bin/sh
# PostgreSQL 일간 백업 + 보관 (보관일수 초과분 삭제)
# backup 서비스에서 매일 1회 실행. /backups 볼륨에 저장.
set -e

: "${POSTGRES_USER:?POSTGRES_USER required}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD required}"
: "${POSTGRES_DB:?POSTGRES_DB required}"
export PGPASSWORD="$POSTGRES_PASSWORD"

BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
STAMP="$(date +%F-%H%M)"
FILE="$BACKUP_DIR/aiplatform-$STAMP.sql.gz"

mkdir -p "$BACKUP_DIR"
echo "[backup] dumping to $FILE ..."
pg_dump -h db -U "$POSTGRES_USER" -d "$POSTGRES_DB" | gzip > "$FILE"
echo "[backup] done: $(du -h "$FILE" | cut -f1). pruning older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name 'aiplatform-*.sql.gz' -mtime +"$RETENTION_DAYS" -delete
ls -la "$BACKUP_DIR" | tail -10
