---
description: Review code for quality, security, and best practices. Use to ensure code meets standards before merging.
---

# Code Review Workflow

This workflow invokes the **Code Reviewer Agent** to perform thorough code reviews.

## When to Use

- Before merging feature branches
- After completing implementation phases
- When refactoring existing code
- To ensure code quality and standards

## Instructions

1. **Read the code reviewer agent instructions**:
   - Read the file `.gemini/agents/code-reviewer.md` for detailed guidance

2. **Analyze the code changes**:
   - Review all modified files
   - Check for logic errors and bugs
   - Verify adherence to coding standards

3. **Check for common issues**:
   - Security vulnerabilities
   - Performance problems
   - Code duplication
   - Missing error handling
   - Incomplete edge cases

4. **Provide feedback**:
   - Be constructive and specific
   - Suggest improvements with examples
   - Prioritize issues by severity

## Review Checklist

- [ ] Code follows project conventions
- [ ] No security vulnerabilities
- [ ] Performance is acceptable
- [ ] Error handling is complete
- [ ] Tests cover the changes
- [ ] Documentation is updated
- [ ] No code duplication

## Severity Levels

- **Critical**: Must fix before merge (security, data loss)
- **Major**: Should fix (logic errors, performance)
- **Minor**: Nice to fix (style, readability)
- **Nitpick**: Optional suggestions

## Output Format

Provide a code review report with:
- Summary of changes reviewed
- Issues found by severity
- Suggestions for improvement
- Overall assessment (approve/request changes)
