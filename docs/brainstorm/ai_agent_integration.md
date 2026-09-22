# Brainstorm Report: AI Agent Integration for Event Management

## Problem Statement & Requirements
- **Current Issue:** Users spend approximately 2 minutes manually creating an event. They lack easy access to dynamic statistics and deep insights about events.
- **Goal:** Simplify event creation and provide immediate analytical insights through a natural language interface.
- **UI Requirement:** An aesthetic, floating Chatbot widget in the corner of the screen.
- **Constraints:** Must use a free or extremely low-cost AI model capable of handling both NLP and data analysis.

## Evaluated Approaches

### Approach 1: Client-Side Copilot (Frontend-only)
- **Description:** React Chatbot calls Gemini API directly. Returns JSON to auto-fill the event creation modal.
- **Pros:** 
  - Extremely fast to build (KISS).
  - User retains control by reviewing the form before submission.
- **Cons:** 
  - Cannot query complex DB stats directly.
  - Security risk (API Key exposed in React).
- **Verdict:** Insufficient for the analytics requirement.

### Approach 2: Backend Agentic System (Function Calling)
- **Description:** Chatbot UI sends text to a Node.js `/api/ai/chat` endpoint. Node.js uses Gemini 1.5 Flash with Function Calling tools (e.g., `getStats`, `checkConflict`, `draftEvent`).
- **Pros:** 
  - Secure (API key on server).
  - Can fetch real-time DB stats and generate natural language reports.
  - DRY (reuses existing Express controllers).
- **Cons:** 
  - Requires more setup on the backend to define tool schemas.
- **Verdict:** Highly recommended. Satisfies all requirements robustly.

## Final Recommended Solution
**Hybrid Approach: Backend Agentic Workflow + Frontend UI Review**
1. **Model:** Use **Gemini 1.5 Flash** due to its generous free tier, high speed, and excellent support for Function Calling.
2. **Backend:** Implement a chat route in Express. Register tools for `getStats` and `draftEvent`. 
3. **Frontend:** The Chatbot widget sends natural language. 
   - If the user asks for stats, the backend AI calls `getStats()`, synthesizes the response, and replies with text.
   - If the user asks to create an event, the backend AI calls `draftEvent()`, the Node server returns a structured object to React, and React **pops up the pre-filled `ImportEventModal`** for a quick 1-click review (reducing 2 minutes to 5 seconds, while ensuring no bad data is saved blindly).

## Implementation Considerations & Risks
- **Context Limit / Token Usage:** Sending large amounts of DB stats might exceed token limits or slow down response times. We must limit the data returned by `getStats()` to only relevant summaries.
- **Tool Hallucinations:** The AI might try to call functions with incorrect arguments. We must enforce strict JSON schemas for the function tools.

## Success Metrics & Next Steps
- **Metrics:**
  - Time to create an event drops from 120 seconds to < 10 seconds.
  - Chatbot successfully answers 90%+ of stat-related queries without fallback.
- **Next Steps:**
  - Decide if we proceed to `/plan` to map out the API routes, React Chatbot component structure, and Gemini SDK integration.
