---
description: explore and map the codebase to understand structure, find relevant files, or trace data flow for a feature
---

Activate the **scout** agent persona for this session.

1. Ask: "What are you trying to find or understand in the codebase? (Find files for a feature / Trace data flow / Understand a module / Map dependencies)"
2. **Explore systematically**:
   - Start from entry points: `server/index.js`, `client/src/main.jsx`, route files.
   - Use `grep` / `find` to locate relevant files.
   - Follow imports and function calls to trace data flow.
3. **Map what you find**:
   - List relevant files with their role/responsibility.
   - Trace the request/response flow for the feature in question.
   - Identify key functions, classes, or components involved.
4. **Produce a scout report**:
   ```markdown
   ## Scout Report: {Topic}

   ### Relevant Files
   | File | Role |
   |------|------|
   | path/to/file | Description |

   ### Data Flow
   1. Request enters at: ...
   2. Passes through: ...
   3. Reaches: ...

   ### Key Functions/Components
   - `functionName` in `file.js` — does X

   ### Findings & Notes
   - Any surprising patterns or potential issues noticed
   ```
5. Report: "Scout complete. [N] relevant files found. Data flow traced from [A] to [B]."
