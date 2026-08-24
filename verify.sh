#!/bin/sh
# ==============================================================================
# Antigravity Host Deployment Verification Script (verify.sh)
# Purpose: Pre-flight validation script executed on the host system prior to
#          launching 'docker compose up -d'. Ensures host compatibility,
#          environment configuration integrity, and syntax correctness.
# ==============================================================================

BOLD='\033[1m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PASSED_CHECKS=0
FAILED_CHECKS=0

log_pass() {
    printf "${GREEN}  [PASS] %s${NC}\n" "$1"
    PASSED_CHECKS=$((PASSED_CHECKS + 1))
}

log_fail() {
    printf "${RED}  [FAIL] %s${NC}\n" "$1"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
}

log_warn() {
    printf "${YELLOW}  [WARN] %s${NC}\n" "$1"
}

log_info() {
    printf "${BLUE}===> %s${NC}\n" "$1"
}

printf "\n${BOLD}======================================================${NC}\n"
printf "${BOLD} 🐳 Antigravity Deployment Verification Suite (Sprint 4C)${NC}\n"
printf "${BOLD}======================================================${NC}\n\n"

# ------------------------------------------------------------------------------
# 1. Check Docker Engine Installation & Status
# ------------------------------------------------------------------------------
log_info "1. Checking Docker Engine..."
if command -v docker >/dev/null 2>&1; then
    log_pass "Docker CLI is installed ($(docker --version))"
    if docker info >/dev/null 2>&1; then
        log_pass "Docker Daemon is running"
    else
        log_fail "Docker Daemon is NOT running. Please start Docker Desktop or docker.service."
    fi
else
    log_fail "Docker CLI is NOT installed. Please install Docker Engine 20.10+."
fi

# ------------------------------------------------------------------------------
# 2. Check Docker Compose Capability
# ------------------------------------------------------------------------------
log_info "2. Checking Docker Compose..."
COMPOSE_CMD=""
if docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
    log_pass "Docker Compose V2 plugin is available ($(docker compose version | head -n 1))"
elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD="docker-compose"
    log_pass "Docker Compose standalone is available ($(docker-compose --version))"
else
    log_fail "Docker Compose is NOT installed. Please install Docker Compose V2."
fi

# ------------------------------------------------------------------------------
# 3. Environment File Validation (.env)
# ------------------------------------------------------------------------------
log_info "3. Checking Environment Configuration (.env)..."
if [ -f ".env" ]; then
    log_pass "File '.env' exists in root directory"
    
    # Check for placeholder values in essential variables
    MISSING_VARS=""
    for var in FIREBASE_PROJECT_ID FIREBASE_CLIENT_EMAIL FIREBASE_PRIVATE_KEY EMAIL_USER EMAIL_PASS; do
        val=$(grep "^${var}=" .env | cut -d'=' -f2- | tr -d '"' | tr -d "'")
        if [ -z "$val" ] || [ "$val" = "your-firebase-project-id" ] || [ "$val" = "your-service-account@..." ] || [ "$val" = "your-email@gmail.com" ]; then
            MISSING_VARS="$MISSING_VARS $var"
        fi
    done

    if [ -z "$MISSING_VARS" ]; then
        log_pass "All required production environment variables are configured"
    else
        log_fail "Environment file '.env' contains unconfigured/placeholder variables:$MISSING_VARS"
    fi
else
    log_fail "File '.env' does NOT exist! Copy '.env.example' to '.env' and fill in credentials."
fi

# ------------------------------------------------------------------------------
# 4. Validate Docker Compose YAML Configuration
# ------------------------------------------------------------------------------
log_info "4. Validating docker-compose.yml Syntax..."
if [ -n "$COMPOSE_CMD" ]; then
    if $COMPOSE_CMD config --quiet >/dev/null 2>&1; then
        log_pass "docker-compose.yml syntax is valid"
    else
        log_fail "docker-compose.yml has syntax errors or missing required variables!"
    fi
else
    log_warn "Skipped YAML validation (Docker Compose unavailable)"
fi

# ------------------------------------------------------------------------------
# 5. Check Script Line Endings & Executable Permissions
# ------------------------------------------------------------------------------
log_info "5. Checking Shell Scripts Line Endings & Permissions..."
for script in entrypoint.sh healthcheck.sh; do
    if [ -f "$script" ]; then
        if grep -q $'\r' "$script" 2>/dev/null; then
            log_warn "$script contains Windows CRLF line endings (Will be auto-fixed by Dockerfile)"
        else
            log_pass "$script uses Unix LF line endings"
        fi
    else
        log_fail "Script '$script' is missing!"
    fi
done

# ------------------------------------------------------------------------------
# 6. Check Target Host Port Availability (Port 5000)
# ------------------------------------------------------------------------------
log_info "6. Checking Host Port Availability (Port 5000)..."
TARGET_PORT="${PORT:-5000}"
if command -v nc >/dev/null 2>&1; then
    if nc -z 127.0.0.1 "$TARGET_PORT" 2>/dev/null; then
        log_warn "Port $TARGET_PORT is currently bound on host (Container port mapping may conflict if active)."
    else
        log_pass "Port $TARGET_PORT is free and ready for binding"
    fi
else
    log_pass "Port check skipped (nc/netcat tool not installed on host)"
fi

# ------------------------------------------------------------------------------
# Final Summary
# ------------------------------------------------------------------------------
printf "\n${BOLD}======================================================${NC}\n"
printf "${BOLD} Verification Summary: %d Passed | %d Failed${NC}\n" "$PASSED_CHECKS" "$FAILED_CHECKS"
printf "${BOLD}======================================================${NC}\n\n"

if [ "$FAILED_CHECKS" -eq 0 ]; then
    printf "${GREEN}${BOLD}✓ System is 100%% VERIFIED and READY for deployment!${NC}\n"
    printf "  Run: ${BOLD}%s up -d --build${NC}\n\n" "${COMPOSE_CMD:-docker compose}"
    exit 0
else
    printf "${RED}${BOLD}✗ Verification FAILED with %d blocking issue(s).${NC}\n" "$FAILED_CHECKS"
    printf "  Please fix the issues above before running 'docker compose up'.\n\n"
    exit 1
fi
