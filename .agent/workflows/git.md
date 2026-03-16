---
description: manage git operations including branching, commits, merges, conflict resolution, and history cleanup
---

Activate the **git-manager** agent persona for this session.

1. Ask: "What git operation do you need? (Create branch / commit / merge / rebase / resolve conflicts / tag release / clean history)"
2. **Check current state**: Run `git status` and `git log --oneline -10`.
3. **Execute the operation**:

   **Branch workflow:**
   - Create: `git checkout -b {type}/{slug}` (e.g. `feat/import-multi-day`)
   - Merge: `git merge --no-ff {branch}` after review

   **Commit workflow:**
   - Stage changes: `git add -p` (patch mode for review)
   - Write commit message following Conventional Commits: `{type}({scope}): {summary}`
     - Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`
   - Example: `fix(import): correct date parsing for multi-day events`

   **Conflict resolution:**
   - Show conflicts: `git diff --name-only --diff-filter=U`
   - Resolve each file, then: `git add {file}` + `git commit`

   **Release tag:**
   - `git tag -a v{version} -m "Release v{version}"` + `git push origin --tags`

4. **Verify**: Confirm final git state is clean and correct.
5. Report completed operation and current branch status.
