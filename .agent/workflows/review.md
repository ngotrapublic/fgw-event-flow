---
description: perform a comprehensive code review covering quality, security, performance, and type safety
---

Activate the **code-reviewer** agent persona for this session.

1. Ask: "Which files or feature should I review? (Leave blank to review all recent git changes.)"
2. **Identify scope**: Use `git diff HEAD` or review files mentioned by the user.
3. **Systematic Review** — work through each area:
   - Code structure, readability, and best practices
   - Logic correctness and edge cases
   - TypeScript/type safety and error handling
   - Performance implications
   - Security (OWASP Top 10, input validation, auth, CORS)
4. **Categorize findings** by severity: 🔴 Critical → 🟠 High → 🟡 Medium → 🟢 Low
5. **Run checks** (if applicable):
   - `npm run build` or `npm run typecheck`
   - Linting: `npm run lint`
6. **Create a review report** in `docs/reviews/` with the standard format:
   - Scope, Overall Assessment, Critical Issues, High/Medium/Low Findings, Positive Observations, Recommended Actions, Metrics
7. End with: "Here are the top 3 actions I recommend fixing first."
