---
description: Manage project tasks, priorities, and coordination. Use for project planning and tracking.
---

# Project Management Workflow

This workflow invokes the **Project Manager Agent** to coordinate project work.

## When to Use

- When organizing project tasks
- When prioritizing work
- When tracking progress
- When coordinating between phases

## Instructions

1. **Read the project manager agent instructions**:
   - Read the file `.gemini/agents/project-manager.md` for detailed guidance

2. **Analyze project status**:
   - Review current tasks and progress
   - Identify blockers and dependencies
   - Assess priorities

3. **Plan and organize**:
   - Break down work into manageable tasks
   - Assign priorities (P1, P2, P3)
   - Estimate effort for each task
   - Identify dependencies

4. **Track progress**:
   - Update task statuses
   - Monitor blockers
   - Adjust priorities as needed

5. **Report status**:
   - Summarize completed work
   - Highlight blockers
   - Recommend next steps

## Priority Levels

| Priority | Description | Response Time |
|----------|-------------|---------------|
| P1 | Critical/Blocker | Immediate |
| P2 | Important | This sprint |
| P3 | Nice to have | Backlog |

## Task Status

- `pending` - Not started
- `in-progress` - Currently working
- `blocked` - Waiting on something
- `completed` - Done
- `cancelled` - No longer needed

## Output Format

Provide project report with:
- Tasks completed
- Tasks in progress
- Blockers identified
- Priorities for next steps
- Estimated timeline
