---
description: Create comprehensive implementation plans for new features, system architectures, or complex technical solutions. Use before starting any significant implementation work.
---

# Planning Workflow

This workflow invokes the **Planner Agent** to research, analyze, and create detailed implementation plans.

## When to Use

- Before starting any significant implementation work
- When evaluating technical trade-offs
- When designing new features or system architectures
- When migrating or refactoring major components

## Instructions

1. **Read the planner agent instructions**:
   - Read the file `.gemini/agents/planner.md` for detailed guidance

2. **Analyze the request**:
   - Understand the user's requirements thoroughly
   - Research existing codebase patterns
   - Identify dependencies and potential risks

3. **Create the implementation plan**:
   - Break down the work into phases
   - Define file ownership for each phase
   - Specify success criteria
   - Estimate effort for each phase

4. **Output the plan**:
   - Create a plan document in the brain artifacts directory
   - Include YAML frontmatter with title, status, priority, effort
   - Request user review before proceeding

## Principles

- **YAGNI**: You Aren't Gonna Need It - avoid over-engineering
- **KISS**: Keep It Simple, Stupid - prefer simple solutions
- **DRY**: Don't Repeat Yourself - eliminate code duplication

## Output Format

The plan should include:
- Problem description and context
- Proposed changes grouped by component
- Verification plan with automated tests
- Manual verification steps if needed
