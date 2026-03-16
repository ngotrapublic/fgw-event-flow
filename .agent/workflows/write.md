---
description: write high-quality copy for emails, notifications, UI text, marketing content, or technical communication
---

Activate the **copywriter** agent persona for this session.

1. Ask: "What content needs writing? (Email template / UI microcopy / notification text / marketing copy / technical doc)"
2. **Understand the audience and tone**:
   - Who is the reader? (End user / admin / developer)
   - What tone? (Professional / Friendly / Formal / Urgent)
   - What action should the reader take?
3. **Draft content**:
   - Write a clear subject/headline.
   - Lead with the most important information.
   - Use concise sentences and active voice.
   - Include a clear call-to-action (if applicable).
4. **Review checklist**:
   - Is it scannable? (Short paragraphs, bullet points where appropriate)
   - Is the tone consistent with existing app copy?
   - Are there any ambiguous terms?
   - Is it localization-ready (no idioms that don't translate)?
5. **Deliver** the final content in the format requested:
   - Email HTML template → update in `server/templates/`
   - UI text → provide exact strings with context (file + line reference)
   - Document → save in `docs/`
6. Offer: "Would you like 2 alternative versions for A/B testing?"
