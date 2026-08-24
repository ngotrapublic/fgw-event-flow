#!/bin/sh
set -e

# ==========================================
# Antigravity Docker Entrypoint
# ==========================================

echo "Starting Antigravity Container..."

# ---- Environment Validation ----

# Firebase (Critical — app will crash without these)
if [ -z "$FIREBASE_PROJECT_ID" ]; then
  echo "WARNING: FIREBASE_PROJECT_ID is not set. Application may fail to connect to Firestore."
fi

if [ -z "$FIREBASE_CLIENT_EMAIL" ] || [ -z "$FIREBASE_PRIVATE_KEY" ]; then
  echo "WARNING: Firebase credentials are missing. Authentication and database operations will fail."
fi

# SMTP (Required for email notifications)
if [ -z "$EMAIL_USER" ] || [ -z "$EMAIL_PASS" ]; then
  echo "WARNING: EMAIL_USER or EMAIL_PASS is not set. Email notifications will fail."
fi

# Ensure exports directory has correct permissions at runtime
# (Though we chown in Dockerfile, mounted volumes might have different permissions)
# Note: As a non-root user, we might not have permission to chown, so we just check writability.
if [ ! -w "./server/public/exports" ]; then
  echo "ERROR: The directory ./server/public/exports is not writable by the node user."
  echo "Please ensure the mounted Docker Volume has the correct permissions."
fi

echo "Environment validation complete. Executing command..."

# Execute the main process (usually `node server/index.js`)
exec "$@"
