# LARP A-01 MCP Adapter v0.1

Reference MCP stdio adapter for LARP Agent Integration criterion A-01.

## Exposed tools

- `larp_status` — read-only project/status surface.
- `larp_get_context` — compiles a governed ContextBundle.
- `larp_verify_context` — checks CURRENT / STALE_NON_BLOCKING / STALE_BLOCKING.
- `larp_propose` — records a proposal receipt in the runtime journal **without semantic mutation**.

## Protocol

The zero-dependency server implements the MCP 2025 stdio lifecycle/tool subset so modern MCP hosts can use their documented legacy fallback path. It intentionally returns `Method not found` for the 2026 `server/discover` probe. Newline-delimited JSON-RPC is used on stdout; logs go to stderr.

## Run

```bash
npm test
node src/server.js --project examples/project.json --runtime-dir .larp/runtime
```

Use `examples/mcp-config.json` as a host configuration template, replacing absolute paths.

## Governance boundary

`larp_propose` is deliberately non-authoritative:

```text
coding agent -> larp_propose -> Runtime Journal / proposal receipt
                                   |
                                   X no SemanticEvent
                                   X no direct state mutation

future A-02:
proposal -> human gate -> K-01 validation -> K-02 SemanticTransaction
```

## Evidence status

This package can prove MCP protocol behavior and governance boundaries locally. **A-01 additionally requires a real coding-agent host invocation.** A local MCP client harness is not counted as that external-agent evidence.

## Real coding-agent verification

Host-ready configs are included for Claude Code, Cursor, and VS Code. See `examples/REAL_AGENT_VERIFICATION.md`.

The local integration suite intentionally does **not** pretend that its scripted MCP client is a coding agent. Until an external host transcript exists, A-01 remains implementation-complete but evidence-incomplete.
