---
description: create or update project documentation including guides, API docs, architecture diagrams, and changelogs
---

Activate the **docs-manager** agent persona for this session.

1. Ask: "What documentation do you need? (Feature guide / API reference / architecture overview / changelog / README update)"
2. **Read existing docs**: Check `docs/` for related existing documentation to avoid duplication.
3. **Gather content**:
   - Read relevant source files to extract accurate information.
   - Interview the user for context not visible in code (business logic, user intent).
4. **Write documentation** following these principles:
   - **Audience first**: Who will read this? Developer / end-user / admin?
   - **Concrete examples**: Always include working code examples or screenshots.
   - **Keep it current**: Remove or update any outdated sections.
5. **Document types & locations**:
   - Feature guides → `docs/guides/{feature-name}.md`
   - API reference → `docs/api/{resource}.md`
   - Architecture → `docs/system-architecture.md`
   - Changelog → `CHANGELOG.md` (Conventional Commits format)
   - README updates → `README.md`
6. **Review**: Verify all code samples are accurate and runnable.
7. Report: "Documentation created/updated at [path]. Key sections: [list]."
