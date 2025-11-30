#!/bin/bash
set -euo pipefail

# =============================================================================
# Easy Backend - Database Backup Script
# =============================================================================

BACKUP_DIR="/var/backups/easy-backend"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="easy_db_backup_${TIMESTAMP}.sql.gz"

echo "========================================"
echo "Easy Backend - Database Backup"
echo "========================================"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Get database credentials from .env
source .env

echo "Creating backup: $BACKUP_FILE"

# Create backup using docker-compose
docker-compose exec -T db pg_dump -U ${POSTGRES_USER:-easy} ${POSTGRES_DB:-easy_prod} | gzip > "${BACKUP_DIR}/${BACKUP_FILE}"

if [ $? -eq 0 ]; then
    echo "✓ Backup created successfully"
    echo "  Location: ${BACKUP_DIR}/${BACKUP_FILE}"
    
    # Get backup size
    SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_FILE}" | cut -f1)
    echo "  Size: $SIZE"
    
    # Keep only last 7 days of backups
    echo "Cleaning old backups (keeping last 7 days)..."
    find "$BACKUP_DIR" -name "easy_db_backup_*.sql.gz" -mtime +7 -delete
    
    echo "✓ Backup complete"
else
    echo "✗ Backup failed"
    exit 1
fi

# List recent backups
echo ""
echo "Recent backups:"
ls -lh "$BACKUP_DIR" | tail -n 5
