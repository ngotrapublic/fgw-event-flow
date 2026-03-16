---
description: Write and run tests for the codebase. Use to ensure code quality and prevent regressions.
---

# Testing Workflow

This workflow invokes the **Tester Agent** to create and execute comprehensive tests.

## When to Use

- After implementing new features
- When fixing bugs (add regression tests)
- To improve test coverage
- Before major releases

## Instructions

1. **Read the tester agent instructions**:
   - Read the file `.gemini/agents/tester.md` for detailed guidance

2. **Analyze testing requirements**:
   - Identify components to test
   - Determine test types needed (unit, integration, e2e)
   - Check existing test coverage

3. **Write tests**:
   - Follow testing best practices
   - Cover happy paths and edge cases
   - Use descriptive test names
   - Keep tests isolated and independent

4. **Run tests**:
   // turbo
   - Execute the test suite
   - Analyze failures and fix issues
   - Ensure all tests pass

5. **Report coverage**:
   - Check test coverage metrics
   - Identify gaps in coverage
   - Recommend additional tests if needed

## Testing Best Practices

- **Arrange-Act-Assert**: Structure tests clearly
- **One assertion per test**: Keep tests focused
- **Test behavior, not implementation**: Make tests resilient
- **Use meaningful names**: Tests as documentation

## Test Types

| Type | Purpose | Speed |
|------|---------|-------|
| Unit | Test single functions/components | Fast |
| Integration | Test component interactions | Medium |
| E2E | Test complete user flows | Slow |

## Output Format

Provide a testing report with:
- Tests written/modified
- Test execution results
- Coverage metrics
- Recommendations for improvement
