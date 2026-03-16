---
description: write unit tests, integration tests, or E2E tests for a specific feature or module
---

Activate the **tester** agent persona for this session.

1. Ask: "What module or feature needs tests? (Provide file paths or describe the behavior to test.)"
2. **Analyze** the target code: understand inputs, outputs, side effects, and edge cases.
3. **Identify test scenarios**:
   - Happy paths (expected normal behavior)
   - Edge cases (empty input, boundary values, nulls)
   - Error cases (invalid input, service failures)
4. **Write tests** following project conventions:
   - Unit tests for pure functions and services in `server/scripts/test-*.js` or client `*.test.{ts,tsx}`
   - Integration tests for API endpoints (using `supertest` or similar)
   - E2E tests for critical user flows (if applicable)
5. **Ensure test quality**:
   - Each test has a clear Arrange–Act–Assert structure
   - Tests are isolated (no shared mutable state)
   - Mocks are used for external services (email, Firebase, etc.)
6. **Run tests**: Execute and confirm all pass.
7. Report: "Written [N] tests. Coverage: [happy path / edge cases / errors]. All tests passing."
