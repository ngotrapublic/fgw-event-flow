---
description: Manage Git operations including branching, commits, merges, and release management. Use for version control tasks.
---

# Git Management Workflow

This workflow invokes the **Git Manager Agent** to handle version control.

## When to Use

- When creating feature branches
- When writing commit messages
- When merging branches
- When managing releases

## Instructions

1. **Read the git manager agent instructions**:
   - Read the file `.gemini/agents/git-manager.md` for detailed guidance

2. **Branch management**:
   - Create feature branches from main/develop
   - Use consistent naming conventions
   - Keep branches focused and short-lived

3. **Commit practices**:
   - Write clear, descriptive commit messages
   - Make atomic commits (one logical change per commit)
   - Use conventional commit format

4. **Merge strategy**:
   - Rebase feature branches before merging
   - Squash commits when appropriate
   - Resolve conflicts carefully

5. **Release management**:
   - Tag releases with semantic versioning
   - Write release notes
   - Update changelogs

## Branch Naming Convention

| Type | Format | Example |
|------|--------|---------|
| Feature | `feat/description` | `feat/user-auth` |
| Bugfix | `fix/description` | `fix/login-error` |
| Hotfix | `hotfix/description` | `hotfix/security-patch` |

## Commit Message Format

```
type(scope): subject

body (optional)

footer (optional)
```

**Types**: feat, fix, docs, style, refactor, test, chore

## Common Commands

```bash
// turbo
git status
// turbo
git log -n 5 --oneline
```

## Output Format

Provide git report with:
- Branches created/modified
- Commits made
- Merge status
- Any conflicts resolved
