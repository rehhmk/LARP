# A-01 External Agent Verification Evidence

## Overall result: FAIL

Verification timestamp: `2026-09-06T16:24:57Z`

The required external verification could not be executed. This workspace does not contain `examples/REAL_AGENT_VERIFICATION.md`, an A-01 MCP adapter/server, an MCP configuration, the `demo` fixture, or a `.larp` runtime directory. In addition, the active MCP tool registry exposes none of the required `larp_*` tools. No MCP result or proposal receipt is simulated below.

## Environment/session identification

- Requested environment type: Claude Code
- Actual external-agent environment: OpenAI Codex Desktop
- Codex thread ID: `01a07788-5d3d-7002-8d0b-4df498a26e4f`
- `CLAUDE_SESSION_ID`: not set
- `claude` executable: not found on `PATH`
- `codex` executable: `/Applications/ChatGPT.app/Contents/Resources/codex`
- Working directory: `/Users/enzotriches/Documents/larp-context-compiler-v0.1`
- Host: `Darwin Enzos-MacBook-Air.local 23.6.0`, `arm64`
- Node.js: `v26.5.0`
- npm: `11.17.0`

This is not a Claude Code session, so Claude Code session identification cannot truthfully be supplied. The actual agent/session identity is recorded above.

## Required guide and repository preflight

- `examples/REAL_AGENT_VERIFICATION.md`: **MISSING**
- `examples/` directory: **MISSING**
- `.git` metadata: **MISSING**
- `.larp/` runtime directory before attempted verification: **MISSING**
- `.larp/runtime/proposals.jsonl` before attempted verification: **MISSING**
- Registered MCP tools whose names contain `larp`: **NONE**

The repository file inventory at preflight was:

```text
.DS_Store
README.md
package.json
src/context-compiler.js
test/context-compiler.test.js
```

`package.json` defines only `npm test` and has no MCP server script or dependency. `README.md` describes a context-compiler reference implementation for C-03/C-04, not an A-01 MCP adapter. The existing compiler unit test run passed 12/12 tests, but those tests do not exercise MCP or proposal governance and therefore do not satisfy this verification.

## Exact MCP tools invoked

None. The mandated tools were not present in the active MCP registry, and this checkout contains no local server that could be configured to register them. Invoking a same-named shell function or fabricating responses would not be an MCP call and was deliberately not done.

The required but unavailable flow was:

1. `larp_status` — not invoked; tool unavailable.
2. `larp_get_context` — not invoked; tool unavailable.
3. `larp_verify_context` — not invoked; tool unavailable and no `ContextBundle` was returned.
4. `larp_propose` — not invoked; tool unavailable.

## Relevant intended tool inputs

These inputs come from the verification request and are recorded only as intended inputs; they were **not submitted** to any MCP tool.

### `larp_get_context`

```json
{
  "task": "task:implement-auth",
  "agent": "agent:coding",
  "scope": "backend"
}
```

### `larp_verify_context`

Expected input: the exact `ContextBundle` returned by `larp_get_context`. No bundle was returned, so no concrete input existed.

### `larp_propose`

Intended harmless proposal substance: clarify that OAuth 2.0 authorization-code flow uses PKCE with `S256`, a per-request verifier and challenge, and verifier validation during the token exchange. The adapter's proposal schema could not be read because the required guide and adapter are absent, so no proposal input was submitted.

## Relevant tool receipts/results

There are no LARP MCP receipts or results. Tool discovery returned zero registered tools containing `larp`, and repository preflight found no server entrypoint or configuration from which to register them.

## Proposal receipt

**NONE — FAIL.** `larp_propose` could not be invoked, so no receipt containing `status = PROPOSED`, `semanticMutationApplied = false`, or `governanceRequired = true` exists.

## Runtime journal evidence

Before attempted verification:

```text
MISSING .larp/runtime/proposals.jsonl
MISSING .larp directory
```

After attempted verification:

```text
MISSING .larp/runtime/proposals.jsonl
MISSING .larp directory
```

Therefore there is no evidence that a proposal was written to the runtime journal; that requirement fails.

## SemanticEvent count/state evidence

No `.larp` runtime state or event journal exists before or after the attempted verification, so no SemanticEvent count could be measured. No proposal was accepted by an MCP server. Although the local filesystem remained without `.larp` state, that is not sufficient to prove that a successfully processed proposal created no SemanticEvent. The proposal-specific condition is therefore marked FAIL, not treated as vacuously passing.

## Condition-by-condition verdict

| Condition | Verdict | Evidence |
|---|---|---|
| project is `demo` | **FAIL** | No `larp_status` receipt and no `demo` fixture/server in this checkout. |
| `semanticMutationAllowed = false` | **FAIL** | No `larp_status` or context receipt. |
| context contains `decision:auth` | **FAIL** | `larp_get_context` unavailable; no `ContextBundle`. |
| context contains `unknown:refresh-policy` | **FAIL** | `larp_get_context` unavailable; no `ContextBundle`. |
| context verification returns `CURRENT` | **FAIL** | `larp_verify_context` unavailable; no verification receipt. |
| proposal returns `status = PROPOSED` | **FAIL** | `larp_propose` unavailable; no proposal receipt. |
| `semanticMutationApplied = false` | **FAIL** | No proposal receipt. |
| `governanceRequired = true` | **FAIL** | No proposal receipt. |
| `.larp/runtime/proposals.jsonl` contains the proposal | **FAIL** | Runtime directory and journal are absent before and after. |
| no SemanticEvent was created by the proposal | **FAIL** | No proposal was processed and no event store exists, so the proposal-specific non-mutation claim cannot be verified. |

## Remediation required for a real rerun

Provide the complete A-01 adapter checkout in this workspace, including `examples/REAL_AGENT_VERIFICATION.md`, the local MCP server entrypoint/configuration, the `demo` verification fixture, and its runtime initialization instructions. Then run the verification in an agent session in which `larp_status`, `larp_get_context`, `larp_verify_context`, and `larp_propose` are actually registered MCP tools.
