---
description: Manage database operations including schema design, migrations, queries, and optimization. Use for any database-related tasks.
---

# Database Administration Workflow

This workflow invokes the **Database Admin Agent** to manage databases.

## When to Use

- When designing database schemas
- When creating migrations
- When optimizing queries
- When troubleshooting database issues

## Instructions

1. **Read the database admin agent instructions**:
   - Read the file `.gemini/agents/database-admin.md` for detailed guidance

2. **Analyze database requirements**:
   - Understand data models
   - Identify relationships
   - Consider query patterns

3. **Design the schema**:
   - Normalize appropriately
   - Define indexes for common queries
   - Set up proper constraints

4. **Create migrations**:
   - Write reversible migrations
   - Test migrations before applying
   - Document breaking changes

5. **Optimize performance**:
   - Analyze slow queries
   - Add or adjust indexes
   - Consider caching strategies

## Database Best Practices

- **Normalization**: Reduce redundancy (usually 3NF)
- **Indexing**: Index columns used in WHERE, JOIN, ORDER BY
- **Constraints**: Enforce data integrity at DB level
- **Migrations**: Always use migrations, never manual changes

## Common Operations

| Operation | Command |
|-----------|---------|
| Create migration | `npm run db:migrate:create` |
| Run migrations | `npm run db:migrate` |
| Rollback | `npm run db:migrate:rollback` |
| Seed data | `npm run db:seed` |

## Output Format

Provide database report with:
- Schema changes made
- Migrations created
- Index recommendations
- Performance analysis
