#!/usr/bin/env bash
# Go-Live HTTPS & Proxy Hardening Verification Script (HIGH-RECHECK-01)
# Usage: bash deploy/verify-https-deploy.sh [domain]
# Default domain: event.greenwichvietnam.edu.vn

set -euo pipefail

DOMAIN="${1:-event.greenwichvietnam.edu.vn}"
TIMEOUT_SEC=10
FAILURES=0

pass() {
  printf '[PASS] %s\n' "$1"
}

fail() {
  printf '[FAIL] %s\n' "$1" >&2
  FAILURES=$((FAILURES + 1))
}

echo "=== Verifying public HTTPS deployment for ${DOMAIN} ==="

# 1. HTTP port 80 must redirect (301 or 308) to https://${DOMAIN}/borrow
HTTP_HEADERS="$(curl -sS -I --max-time "${TIMEOUT_SEC}" "http://${DOMAIN}/borrow" 2>&1 || true)"
HTTP_STATUS="$(printf '%s\n' "${HTTP_HEADERS}" | awk 'toupper($1) ~ /^HTTP\// { code=$2 } END { print code }')"
HTTP_LOCATION="$(printf '%s\n' "${HTTP_HEADERS}" | awk 'tolower($1)=="location:" { sub(/\r$/, "", $2); print $2; exit }')"

if [[ "${HTTP_STATUS}" == "301" || "${HTTP_STATUS}" == "308" ]] && [[ "${HTTP_LOCATION}" == "https://${DOMAIN}/borrow"* ]]; then
  pass "HTTP -> HTTPS redirect (${HTTP_STATUS} -> ${HTTP_LOCATION})"
else
  fail "Expected 301/308 redirect from http://${DOMAIN}/borrow to https://${DOMAIN}/borrow, got status='${HTTP_STATUS:-UNREACHABLE}' location='${HTTP_LOCATION:-NONE}'"
fi

# 2. HTTPS port 443 must serve 200 with Strict-Transport-Security & Borrow privacy headers
HTTPS_HEADERS="$(curl -sS -I --max-time "${TIMEOUT_SEC}" "https://${DOMAIN}/borrow" 2>&1 || true)"
HTTPS_STATUS="$(printf '%s\n' "${HTTPS_HEADERS}" | awk 'toupper($1) ~ /^HTTP\// { code=$2 } END { print code }')"

if [[ "${HTTPS_STATUS}" == "200" ]]; then
  pass "HTTPS GET /borrow returned 200"
else
  fail "Expected HTTP 200 from https://${DOMAIN}/borrow, got '${HTTPS_STATUS:-UNREACHABLE}'"
fi

if printf '%s\n' "${HTTPS_HEADERS}" | grep -qiE '^strict-transport-security:.*max-age='; then
  pass "Strict-Transport-Security header present on HTTPS /borrow"
else
  fail "Missing Strict-Transport-Security header on https://${DOMAIN}/borrow"
fi

if printf '%s\n' "${HTTPS_HEADERS}" | grep -qiE '^cache-control:.*no-store'; then
  pass "Cache-Control: no-store present on HTTPS /borrow"
else
  fail "Missing Cache-Control: no-store header on https://${DOMAIN}/borrow"
fi

if printf '%s\n' "${HTTPS_HEADERS}" | grep -qiE '^referrer-policy:.*no-referrer'; then
  pass "Referrer-Policy: no-referrer present on HTTPS /borrow"
else
  fail "Missing Referrer-Policy: no-referrer header on https://${DOMAIN}/borrow"
fi

# 3. Direct port 5000 must NOT be reachable from the Internet
PORT5000_STATUS="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 5 "http://${DOMAIN}:5000/health" 2>/dev/null || echo 'UNREACHABLE')"
if [[ "${PORT5000_STATUS}" == "UNREACHABLE" || "${PORT5000_STATUS}" == "000" ]]; then
  pass "Direct port 5000 blocked externally (status=${PORT5000_STATUS})"
else
  fail "Port 5000 is exposed externally (HTTP ${PORT5000_STATUS})! Firewall/bind to 127.0.0.1:5000 immediately."
fi

# 4. Reminder for __Host-borrow cookie verification
echo "=== Manual / Authenticated Cookie Spot Check ==="
echo "Run a real borrow submit or link exchange over HTTPS and inspect Set-Cookie:"
echo "  Expected: __Host-borrow=...; Path=/; HttpOnly; Secure; SameSite=Lax"

if [[ "${FAILURES}" -gt 0 ]]; then
  echo "Verification FAILED with ${FAILURES} issue(s)." >&2
  exit 1
fi

echo "All automated HTTPS deployment checks PASSED."

