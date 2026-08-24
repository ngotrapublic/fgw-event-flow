#!/bin/sh
# ==============================================================================
# Antigravity Container Healthcheck Script
# Purpose: Lightweight probe used by Docker Engine & Orchestrators to determine
#          container liveness via the /health endpoint.
# ==============================================================================

set -e

PORT="${PORT:-5000}"
HEALTH_URL="http://127.0.0.1:${PORT}/health"

# 1. Primary check: Use curl if available
if command -v curl >/dev/null 2>&1; then
    response=$(curl -s -f -m 5 "$HEALTH_URL" 2>/dev/null)
    if echo "$response" | grep -q '"status"'; then
        exit 0
    else
        echo "[HEALTHCHECK FAILED] Invalid response: $response"
        exit 1
    fi
# 2. Secondary check: Use wget as fallback
elif command -v wget >/dev/null 2>&1; then
    response=$(wget -q -O - -T 5 "$HEALTH_URL" 2>/dev/null)
    if echo "$response" | grep -q '"status"'; then
        exit 0
    else
        echo "[HEALTHCHECK FAILED] Invalid response"
        exit 1
    fi
# 3. Tertiary check: Fallback to Node.js HTTP request
else
    node -e "
        const http = require('http');
        const req = http.get('$HEALTH_URL', (res) => {
            if (res.statusCode === 200) process.exit(0);
            else process.exit(1);
        });
        req.on('error', () => process.exit(1));
        req.setTimeout(5000, () => { req.destroy(); process.exit(1); });
    "
fi
