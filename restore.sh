#!/bin/sh
# ==============================================================================
# Antigravity Volume Restore Script (restore.sh)
# Purpose: Restore Docker Named Volume 'antigravity_exports' from a tar.gz archive.
# Usage: ./restore.sh <path_to_backup_archive.tar.gz>
# ==============================================================================

set -e

VOLUME_NAME="antigravity_exports"
ARCHIVE_FILE="$1"

BOLD='\033[1m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

if [ -z "$ARCHIVE_FILE" ]; then
    printf "${RED}[ERROR] Usage: ./restore.sh <path_to_backup_archive.tar.gz>${NC}\n"
    printf "Example: ./restore.sh ./backups/antigravity_exports_backup_20260803_120000.tar.gz\n"
    exit 1
fi

if [ ! -f "$ARCHIVE_FILE" ]; then
    printf "${RED}[ERROR] Backup archive file '%s' not found!${NC}\n" "$ARCHIVE_FILE"
    exit 1
fi

printf "${BLUE}===> [RESTORE] Preparing to restore volume '%s' from '%s'...${NC}\n" "$VOLUME_NAME" "$ARCHIVE_FILE"

# 1. Check Docker status
if ! docker info >/dev/null 2>&1; then
    printf "${RED}[ERROR] Docker daemon is not running.${NC}\n"
    exit 1
fi

# 2. Ensure volume exists or create it
if ! docker volume inspect "$VOLUME_NAME" >/dev/null 2>&1; then
    printf "${YELLOW}[INFO] Volume '%s' does not exist. Creating it...${NC}\n" "$VOLUME_NAME"
    docker volume create "$VOLUME_NAME" >/dev/null
fi

# 3. Perform restoration via ephemeral alpine container
ARCHIVE_DIR=$(dirname "$ARCHIVE_FILE")
ARCHIVE_BASE=$(basename "$ARCHIVE_FILE")
FULL_ARCHIVE_DIR=$(cd "$ARCHIVE_DIR" && pwd)

printf "${YELLOW}===> Restoring data into volume '%s'...${NC}\n" "$VOLUME_NAME"

docker run --rm \
    -v "${VOLUME_NAME}:/volume" \
    -v "${FULL_ARCHIVE_DIR}:/backup:ro" \
    alpine \
    sh -c 'rm -rf /volume/* /volume/.* 2>/dev/null || true; tar -xzf "/backup/'"${ARCHIVE_BASE}"'" -C /volume'

printf "${GREEN}${BOLD}✓ Volume '%s' successfully restored from archive!${NC}\n\n" "$VOLUME_NAME"
