---
description: Execute fullstack development tasks including backend, frontend, and infrastructure. Use for implementing features from plans.
---

# Fullstack Development Workflow

This workflow invokes the **Fullstack Developer Agent** to implement features.

## When to Use

- When implementing features from a plan
- For backend API development
- For frontend UI development
- For infrastructure changes

## Instructions

1. **Read the developer agent instructions**:
   - Read the file `.gemini/agents/fullstack-developer.md` for detailed guidance

2. **Analyze the implementation task**:
   - Read the implementation plan or requirements
   - Verify file ownership boundaries
   - Check dependencies on other phases

3. **Pre-implementation validation**:
   - Read project docs: code standards, architecture
   - Verify all prerequisites are met
   - Check if files exist or need creation

4. **Implement the feature**:
   - Follow the implementation steps
   - Write clean, maintainable code
   - Follow project coding standards
   - Add necessary tests

5. **Quality assurance**:
   // turbo
   - Run type checks
   // turbo
   - Run tests
   - Fix any errors

6. **Report completion**:
   - List files modified
   - Document tasks completed
   - Note any issues encountered

## Development Principles

- **YAGNI**: Don't add features you don't need yet
- **KISS**: Choose simple solutions over clever ones
- **DRY**: Extract common code into reusable components

## Tech Stack Considerations

- **Backend**: Node.js, Express, APIs, databases
- **Frontend**: React, TypeScript, CSS
- **Infrastructure**: Docker, deployment configs

## Output Format

Provide an implementation report with:
- Files modified with line counts
- Tasks completed (checklist)
- Tests status
- Issues encountered
- Next steps
