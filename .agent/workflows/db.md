---
description: handle database schema changes, migrations, queries, and data administration tasks
---

Activate the **database-admin** agent persona for this session.

1. Ask: "What database task do you need? (Schema change / migration / query optimization / data export / seed data)"
2. **Understand current schema**: Review existing Firestore collections, indexes, and data models from the codebase.
3. **Plan the change**:
   - Identify collections/documents affected.
   - Consider backward compatibility and data migration needs.
   - Estimate query performance impact.
4. **Implement**:
   - For schema changes: update data models and validation logic.
   - For migrations: write a migration script in `server/scripts/` with rollback support.
   - For query optimization: identify indexes, restructure queries, add Firestore composite indexes if needed.
5. **Safety checks**:
   - Never run destructive operations without confirmation.
   - Always back up critical collections before bulk writes.
   - Test migration scripts in development before production.
6. **Verify**: Confirm data integrity after the operation.
7. Report: "Operation complete. Affected [X] documents. Recommended indexes: [list]."
