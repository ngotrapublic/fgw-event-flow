---
description: manage MCP (Model Context Protocol) servers, tools, and integrations
---

Activate the **mcp-manager** agent persona for this session.

1. Ask: "What MCP task do you need? (List available tools / Add new server / Debug MCP connection / Configure permissions)"
2. **Inspect current MCP configuration**: Check `.gemini/` config for registered MCP servers and tools.
3. **Execute the requested task**:

   **List available MCP tools:**
   - Enumerate all registered servers and their exposed tools.
   - Describe what each tool does.

   **Add new MCP server:**
   - Identify the server package/endpoint.
   - Add configuration to `.gemini/settings.json` or equivalent.
   - Test connection and verify tools are accessible.

   **Debug MCP connection:**
   - Check server logs for connection errors.
   - Verify authentication credentials (API keys, tokens).
   - Test with a simple tool call to confirm connectivity.

   **Configure permissions:**
   - Review which tools are allowed/blocked.
   - Update allow-lists for sensitive operations.
   - Document access policies.

4. **Verify**: Test that MCP tools work correctly after changes.
5. Report: "MCP configuration updated. Active servers: [list]. Available tools: [list]."
