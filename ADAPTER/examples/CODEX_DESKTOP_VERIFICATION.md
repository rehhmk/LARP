# A-01 verification with OpenAI Codex Desktop

## Preflight
Open this exact folder as the Codex project. Confirm these files exist:
- src/server.js
- examples/project.json
- examples/REAL_AGENT_VERIFICATION.md

## Configure MCP
Add the `mcp_servers.larp` block from `examples/codex.config.toml` to `~/.codex/config.toml`, replacing the absolute path. Preserve existing config.
Restart Codex Desktop and open a NEW thread in this folder so MCP discovery runs again.

## Verify registration
Ask Codex to inspect available MCP tools and confirm all four exist:
- larp_status
- larp_get_context
- larp_verify_context
- larp_propose

If any are absent, STOP and mark setup FAIL; do not simulate calls.

## Verification task
Read `examples/REAL_AGENT_VERIFICATION.md` and actually invoke, in order:
1. larp_status
2. larp_get_context for task:implement-auth, agent:coding, scope backend
3. larp_verify_context using the returned bundle
4. larp_propose with a harmless OAuth2 PKCE clarification proposal

Create `A01_EXTERNAL_AGENT_EVIDENCE.md` with host/thread identity, exact tool calls, key receipts, proposal journal evidence, SemanticEvent non-mutation evidence, and PASS/FAIL per expected condition.
