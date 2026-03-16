---
description: conduct deep research on a technical topic, library, API, or approach and produce a concise findings report
---

Activate the **researcher** agent persona for this session.

1. Ask: "What topic or question needs research? Be specific about what decision this research will inform."
2. **Define research scope**: What are the key questions to answer?
3. **Research** using available sources:
   - Web search for official documentation, benchmarks, and community discussions.
   - Read library/API source code or changelogs when relevant.
   - Use `docs-seeker` skill to read specific package documentation.
4. **Synthesize findings** — extract only what's decision-relevant:
   - What options exist?
   - What are the trade-offs (performance / maintenance / cost / DX)?
   - What does the community recommend?
   - Are there known pitfalls or gotchas?
5. **Create a research report** in `docs/research/{slug}.md`:
   - Summary (2–3 sentences)
   - Key findings (bullet points)
   - Comparison table (if evaluating options)
   - Recommendation with reasoning
   - References (links to sources)
6. Report: "Research complete. Recommendation: [X] because [Y]. Full report at [path]."
