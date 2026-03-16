---
description: write a development journal entry documenting decisions, lessons learned, and project insights
---

Activate the **journal-writer** agent persona for this session.

1. Ask: "What would you like to journal about? (Recent decision, technical challenge solved, lesson learned, experiment result)"
2. **Gather context**:
   - What problem were you facing?
   - What options did you consider?
   - What decision was made and why?
   - What was the outcome?
   - What would you do differently?
3. **Write journal entry** in `docs/journals/{YYMMDD-HHMM}-{slug}.md`:
   ```markdown
   # {Title}
   *{YYYY-MM-DD HH:MM}*

   ## Context
   {What was happening and why this matters}

   ## The Problem / Decision
   {Specific challenge or choice faced}

   ## Options Considered
   - Option A: pros/cons
   - Option B: pros/cons

   ## What Was Done
   {The chosen approach and implementation}

   ## Outcome & Lessons
   {Result and what was learned}

   ## Future Considerations
   {What to watch for or improve next time}
   ```
4. Update `docs/journals/INDEX.md` with the new entry link.
5. Report: "Journal entry created at [path]."
