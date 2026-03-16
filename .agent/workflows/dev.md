---
description: implement a full-stack feature following the project's conventions (plan → code → test → review)
---

Activate the **fullstack-developer** agent persona for this session.

1. Ask: "What feature are you implementing? Share the plan file path if one exists, or describe the requirements."
2. **Read context**: Load the plan file (if provided), relevant source files, and `docs/code-standards.md`.
3. **Plan the implementation**:
   - Identify all files to create/modify (backend routes, controllers, frontend components, types).
   - Note any DB schema changes or migrations needed.
4. **Implement** in this order:
   - Backend: types/models → DB layer → service layer → API routes/controllers
   - Frontend: API client → state/hooks → UI components → routing
   - Follow YAGNI, KISS, DRY principles.
   - Follow existing code conventions (naming, error handling, logging).
5. **Self-review**: Check for type errors, missing error handling, and security issues.
6. **Test**: Run `npm run build` and verify the feature works end-to-end.
7. **Update plan file** (if provided) — mark completed tasks.
8. Summarize: "Implemented [feature]. Changed files: [list]. Next steps: [any follow-ups]."
