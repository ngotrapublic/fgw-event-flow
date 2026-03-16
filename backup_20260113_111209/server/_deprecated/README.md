# ⚠️ Deprecated Files

**Purpose**: This folder contains files that are NO LONGER USED in the production runtime.

## Important Notes

1. **NOT IN RUNTIME**: These files are NOT imported, referenced, or executed by any part of the application.
2. **SAFE TO IGNORE**: You can safely ignore this folder during development and deployment.
3. **DO NOT RESTORE**: Do not move files back to the main codebase without explicit approval from the Tech Lead.

## Contents

| File | Original Purpose | Deprecated Date |
| :--- | :--- | :--- |
| `firebase.backup-20251122.js` | Old Firebase config backup | 2026-01-09 |
| `index.firestore-backup-20251122.js` | Old index.js backup | 2026-01-09 |
| `migrate-locations.js` | One-time migration script | 2026-01-09 |
| `migrate-to-firestore.js` | One-time migration script | 2026-01-09 |
| `crashRepro.js` | Debug reproduction script | 2026-01-09 |
| `reproRound6.js` | Debug reproduction script | 2026-01-09 |
| `reproSanitize.js` | Debug reproduction script | 2026-01-09 |

## Retention Policy

> **Files in this folder will be PERMANENTLY DELETED after 30 days of stable production operation.**

Target deletion date: **2026-02-08** (assuming go-live on 2026-01-09)

## If You Need to Restore

1. Verify the file is actually needed (check import references)
2. Get approval from Tech Lead
3. Move file back to original location
4. Update this README to remove the entry
5. Test thoroughly before deploying
