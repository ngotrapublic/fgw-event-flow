#!/bin/sh
# ==============================================================================
# Antigravity Volume Backup Script (backup.sh)
# Purpose: Backup Docker Named Volume 'antigravity_exports' to a timestamped
#          tar.gz archive on the host system without stopping the container.
# Usage: ./backup.sh [output_directory]
# ==============================================================================

set -e

VOLUME_NAME="antigravity_exports"
BACKUP_DIR="${1:-./backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILENAME="${VOLUME_NAME}_backup_${TIMESTAMP}.tar.gz"

BOLD='\033[1m'
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

printf "${BLUE}===> [BACKUP] Starting backup for volume '%s'...${NC}\n" "$VOLUME_NAME"

# 1. Ensure target backup directory exists
mkdir -p "$BACKUP_DIR"

# 2. Check if Docker daemon is running
if ! docker info >/dev/null 2>&1; then
    printf "${RED}[ERROR] Docker daemon is not running.${NC}\n"
    exit 1
fi

# 3. Check if volume exists
if ! docker volume inspect "$VOLUME_NAME" >/dev/null 2>&1; then
    printf "${RED}[ERROR] Volume '%s' does not exist! Nothing to backup.${NC}\n" "$VOLUME_NAME"
    exit 1
fi

# 4. Perform backup using an ephemeral alpine container
printf "${BLUE}===> Archiving volume contents to %s/%s...${NC}\n" "$BACKUP_DIR" "$BACKUP_FILENAME"

# Convert relative BACKUP_DIR to absolute path
FULL_BACKUP_DIR=$(cd "$BACKUP_DIR" && pwd)

docker run --rm \
    -v "${VOLUME_NAME}:/volume:ro" \
    -v "${FULL_BACKUP_DIR}:/backup" \
    alpine \
    tar -czf "/backup/${BACKUP_FILENAME}" -C /volume .

# 5. Validate backup file creation
if [ -f "${BACKUP_DIR}/${BACKUP_FILENAME}" ]; then
    FILE_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_FILENAME}" 2>/dev/null | cut -f1)
    printf "${GREEN}${BOLD}✓ Backup successfully created!${NC}\n"
    printf "  Archive Path: %s/%s\n" "$BACKUP_DIR" "$BACKUP_FILENAME"
    printf "  Archive Size: %s\n\n" "${FILE_SIZE:-Unknown}"
    exit 0
else
    printf "${RED}[ERROR] Backup file creation failed!${NC}\n"
    exit 1
fi
