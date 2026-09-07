# A-01 Real Coding-Agent Verification

A-01 is not VERIFIED until one actual coding-agent host invokes the adapter.

## Required transcript

The real agent must call, in one task flow:

1. `larp_status`
2. `larp_get_context` for `task:implement-auth`, `agent:coding`, scope `backend`
3. `larp_verify_context` for the returned bundle
4. `larp_propose` with a harmless proposal

Expected properties:

- status returns project `demo` and `semanticMutationAllowed=false`
- context contains `decision:auth` and `unknown:refresh-policy`
- first verification returns `CURRENT`
- proposal returns `status=PROPOSED`, `semanticMutationApplied=false`, `governanceRequired=true`
- `.larp/runtime/proposals.jsonl` contains the proposal
- no semantic event is appended by the adapter

## Claude Code example

From this package directory, after replacing the absolute paths in `examples/claude-code.mcp.json`:

```bash
claude -p \
  --mcp-config examples/claude-code.mcp.json \
  --allowedTools "mcp__larp__larp_status,mcp__larp__larp_get_context,mcp__larp__larp_verify_context,mcp__larp__larp_propose" \
  "Act as the coding agent for task:implement-auth. First inspect LARP status. Then obtain governed context for agent:coding in scope backend. Verify that context. Finally propose, but do not claim to apply, a change that clarifies OAuth2 PKCE. Report the four tool calls and their key receipts."
```

Capture the command output and `proposals.jsonl` as A-01 external evidence.

## Cursor

Copy `examples/cursor.mcp.json` to `.cursor/mcp.json` at the package/workspace root. Cursor Agent discovers enabled MCP tools and can call them when relevant.

## VS Code / Copilot Agent

Copy `examples/vscode.mcp.json` to `.vscode/mcp.json` at the package/workspace root and enable the server from the MCP tooling UI.
