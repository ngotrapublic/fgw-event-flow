---
description: Debug and fix issues in the codebase. Use when encountering errors, bugs, or unexpected behavior.
---

# Debugging Workflow

This workflow invokes the **Debugger Agent** to systematically identify and fix issues.

## When to Use

- When encountering runtime errors or exceptions
- When tests are failing
- When behavior doesn't match expectations
- When performance issues occur

## Instructions

1. **Read the debugger agent instructions**:
   - Read the file `.gemini/agents/debugger.md` for detailed guidance

2. **Gather information**:
   - Collect error messages and stack traces
   - Identify the steps to reproduce the issue
   - Check relevant logs and outputs

3. **Analyze the problem**:
   - Use the 5 Whys technique to find root cause
   - Trace the code flow to identify the issue
   - Check recent changes that might have caused the bug

4. **Implement the fix**:
   - Make minimal, targeted changes
   - Add tests to prevent regression
   - Verify the fix resolves the issue

5. **Document the solution**:
   - Explain what caused the issue
   - Describe the fix applied
   - Note any preventive measures

## Debugging Techniques

- **Binary search**: Narrow down the problem area
- **Print/log debugging**: Add strategic logging
- **Rubber duck debugging**: Explain the problem step by step
- **Root cause analysis**: Don't just fix symptoms

## Output Format

Provide a debugging report with:
- Issue description
- Root cause analysis
- Fix applied
- Tests added
- Verification results
