# ⚠️ Deprecated Components

**Purpose**: This folder contains React components that are NO LONGER USED in the application.

## Important Notes

1. **NOT IN RUNTIME**: These components are NOT imported or rendered anywhere in the app.
2. **SAFE TO IGNORE**: You can safely ignore this folder during development.
3. **DO NOT RESTORE**: Do not move files back without explicit approval from the Tech Lead.

## Contents

| File | Original Purpose | Deprecated Date |
| :--- | :--- | :--- |
| `DepartmentManager.backup.jsx` | Old DepartmentManager backup | 2026-01-09 |
| `PrintPortal.backup.jsx` | Old PrintPortal backup | 2026-01-09 |

## Retention Policy

> **Files in this folder will be PERMANENTLY DELETED after 30 days of stable production operation.**

Target deletion date: **2026-02-08** (assuming go-live on 2026-01-09)

## If You Need to Restore

1. Verify the component is actually needed (check imports in App.jsx/routes)
2. Get approval from Tech Lead
3. Move file back to `components/` folder
4. Update this README to remove the entry
5. Test thoroughly before deploying
