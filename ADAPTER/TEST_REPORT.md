# LARP A-01 MCP Adapter Test Report v0.1

STATUS: IMPLEMENTATION PASS / EXTERNAL AGENT EVIDENCE REQUIRED
DATE: 2026-09-05

## Scope

Build an MCP/adapter boundary that exposes the four A-01 capabilities without allowing an agent to mutate semantic truth directly:

- `larp_status`
- `larp_get_context`
- `larp_verify_context`
- `larp_propose`

## Local executable result

- A-01-specific tests: 14
- Passed: 14
- Failed: 0
- External dependencies: 0
- Transport: newline-delimited JSON-RPC over stdio
- MCP compatibility posture: 2025 legacy lifecycle/tool subset; modern `server/discover` probe receives method-not-found so current hosts can follow their documented legacy fallback path.

## Tests

1. MCP initialize + ping works over stdio.
2. `tools/list` exposes exactly the four A-01 tools.
3. `larp_status` is read-only.
4. `larp_get_context` returns governed Decision/Evidence/Unknown context.
5. Fresh bundle verifies CURRENT.
6. Unrelated project drift stays CURRENT.
7. Required Decision drift becomes STALE_BLOCKING.
8. `larp_propose` records runtime proposal and does not change project semantic fixture.
9. Proposal does not create a SemanticEvent artifact.
10. Argument error is returned as MCP tool error without server crash.
11. Unknown tool is rejected safely.
12. stdout contains protocol JSON only.
13. 2026 discovery probe can fall back to legacy initialization.
14. Context verification accepts a full bundle, not only process-local cache.

## Governance conclusion

The adapter demonstrates the required authority boundary:

```text
Coding Agent
   -> MCP tools
      -> READ context/status/verification
      -> PROPOSE only
             |
             X no direct SemanticEvent
             X no direct semantic state mutation
```

A-02 remains responsible for the proposal -> human gate -> K-01 -> K-02 accepted-event path.

## Evidence boundary

This report does **not** mark roadmap criterion A-01 VERIFIED because the active baseline explicitly requires exposure "to a real coding agent". The current execution environment has no Claude Code, Cursor, Codex, or VS Code agent host executable available. The scripted MCP client proves protocol behavior, not model/host behavior.

`examples/REAL_AGENT_VERIFICATION.md` contains the exact external verification protocol and host configs.
