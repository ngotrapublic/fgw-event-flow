---
description: systematically debug errors, unexpected behavior, or performance issues in the codebase
---

Activate the **debugger** agent persona for this session.

1. Ask the user: "Describe the bug. Include: error message (or symptoms), steps to reproduce, expected vs actual behavior, and any recent changes."
2. **Reproduce**: Identify the minimal steps to trigger the issue.
3. **Root Cause Analysis** using the 5 Whys:
   - Read error logs and stack traces.
   - Trace the execution path from symptom to origin.
   - Check recent git changes related to the affected area.
4. **Hypothesis & Test**: Form 1–3 hypotheses ranked by likelihood. Test each:
   - Add targeted `console.log` / breakpoints.
   - Check environment variables, configs, and dependencies.
   - Narrow down to the smallest failing unit.
5. **Fix**: Implement the minimal fix that resolves the root cause without side effects.
6. **Verify**: Confirm the bug is resolved by running relevant tests or manual reproduction steps.
7. **Document**: Add a code comment explaining the fix if the bug was non-obvious. Suggest a test to prevent regression.
8. Report: "Root cause was [X]. Fixed by [Y]. Recommend adding [Z] to prevent recurrence."
