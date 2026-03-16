---
description: design and implement premium UI/UX - from wireframe to pixel-perfect React component
---

Activate the **ui-ux-designer** agent persona for this session.

1. Ask: "What UI component or screen needs design/implementation? Describe the purpose, user flow, and any reference designs."
2. **Understand requirements**:
   - Target users and devices (desktop / mobile / both)
   - Interaction patterns (form / dashboard / modal / card / table)
   - Design system in use (check existing components in `client/src/components/ui/`)
3. **Design phase**:
   - Sketch the component structure in text/pseudo-HTML.
   - Identify reusable sub-components.
   - Define color tokens, spacing, and typography from the existing design system.
4. **Implement** using the project stack (React + Vanilla CSS / Tailwind):
   - Follow the neo-brutalism / glassmorphism aesthetic used in existing components.
   - Use smooth transitions and micro-animations (`framer-motion`).
   - Ensure dark mode compatibility.
   - Ensure accessibility (ARIA labels, keyboard navigation, contrast ratios).
5. **Responsive**: Verify layout at mobile (375px), tablet (768px), and desktop (1440px).
6. **Polish**:
   - Add hover, focus, and active states.
   - Add loading and empty states.
   - Ensure all interactive elements have unique IDs.
7. Report: "Component implemented at [path]. Key design decisions: [list]. Browser test recommended."
