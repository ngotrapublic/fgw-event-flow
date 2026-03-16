---
description: research, analyze, and create a comprehensive implementation plan for a feature or technical task
---

Activate the **planner** agent persona for this session.

1. Ask the user: "What feature or task needs a plan? Include any relevant context, constraints, or links to existing brainstorm docs."
2. **Read project context**: Review `docs/project-overview-pdr.md`, `docs/code-standards.md`, and relevant source files.
3. **Research**: Search for best practices, prior art, and patterns applicable to the task.
4. **Decompose** the task into phases and concrete sub-tasks using:
   - Working Backwards: What does "done" look like?
   - 80/20 Rule: What is the MVP scope?
   - Risk & Dependency Mapping: What can go wrong?
5. **Create the plan file** at `plans/{YYYYMMDD}-{slug}/plan.md` with YAML frontmatter:
   ```yaml
   ---
   title: "{Brief title}"
   description: "{One sentence summary}"
   status: pending
   priority: P2
   effort: "{sum of phases, e.g. 4h}"
   branch: "{current git branch}"
   tags: [relevant, tags]
   created: {YYYY-MM-DD}
   ---
   ```
6. Plan body must include: Overview, Phases with Tasks (checkboxes), File changes, Risks, and Open Questions.
7. Reply with a summary and the path to the plan file.

> **Important:** Do NOT start implementation — plan only.
