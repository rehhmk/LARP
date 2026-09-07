# A-01 External Coding-Agent Verification Evidence

## Overall result

**PASS**

The LARP adapter was exercised by an actual Codex Desktop coding-agent host through the live MCP registry. All four required MCP calls succeeded in the required order. The final call recorded a governed proposal and did not apply a semantic mutation or create a `SemanticEvent`.

Verification timestamp: `2026-09-07T11:48:53-03:00`

## Codex thread/session identity

- Host: `Codex Desktop` (`com.openai.codex`)
- Codex thread ID: `01a07c54-7490-7801-a8f8-b96394c7de6e`
- MCP client identity reported in the proposal receipt:
  - kind: `MCP_CLIENT`
  - name: `codex-mcp-client`
  - version: `0.145.0-alpha.18`
- Workspace: `/Users/enzotriches/Documents/LARP/ADAPTER`

## Required MCP transcript

No MCP call was simulated. The following live MCP tools were invoked exactly once each and in this order.

### 1. `mcp__larp__larp_status` (`larp_status`)

Exact input:

```json
{}
```

Relevant result:

```json
{
  "adapterVersion": "0.1.0",
  "projectId": "demo",
  "projectPosition": 42,
  "projectFileHash": "b3c428b59e3d8daaa6084522222988d653dd730a4b25c8d5171a362ce36974ce",
  "verifiedCoverage": 76,
  "semanticMutationAllowed": false,
  "taskCounts": {
    "READY": 1
  }
}
```

### 2. `mcp__larp__larp_get_context` (`larp_get_context`)

Exact input:

```json
{
  "taskId": "task:implement-auth",
  "agentId": "agent:coding",
  "scopeId": "backend"
}
```

Relevant receipt/result:

```json
{
  "freshness": "CURRENT",
  "bundle": {
    "projectId": "demo",
    "compileScopeId": "backend",
    "sourceProjectPosition": 42,
    "taskContract": {
      "id": "task:implement-auth",
      "lifecycle": "READY",
      "allowedScope": "backend"
    },
    "authorityContext": {
      "agent": {
        "id": "agent:coding",
        "scopeId": "backend"
      }
    },
    "decisions": [
      {
        "id": "decision:auth",
        "version": 2,
        "data": {
          "statement": "Use OAuth2"
        }
      }
    ],
    "unknowns": [
      {
        "id": "unknown:refresh-policy",
        "version": 1,
        "data": {
          "question": "Exact refresh-token rotation policy?"
        }
      }
    ],
    "inputFingerprint": "ffda35a03e3d9fa148e3a49c5d02c5740548cffc57c8df9f0034a8c9faeb5b24",
    "bundleFingerprint": "51889f2fcc5745e0b63450a06c21b2c26184a2a95bf7c3e7cf11e1fccee339c3"
  },
  "receipt": {
    "taskId": "task:implement-auth",
    "agentId": "agent:coding",
    "scopeId": "backend",
    "sourceProjectPosition": 42,
    "bundleFingerprint": "51889f2fcc5745e0b63450a06c21b2c26184a2a95bf7c3e7cf11e1fccee339c3",
    "inputFingerprint": "ffda35a03e3d9fa148e3a49c5d02c5740548cffc57c8df9f0034a8c9faeb5b24"
  }
}
```

The displayed result is abridged to the fields relevant to A-01. The complete returned `bundle` object was retained in memory and passed directly as the `bundle` argument in step 3; it was not rebuilt or replaced by its fingerprint.

### 3. `mcp__larp__larp_verify_context` (`larp_verify_context`)

Relevant exact input identity:

```json
{
  "bundle": "<the exact complete ContextBundle object returned by step 2; bundleFingerprint 51889f2fcc5745e0b63450a06c21b2c26184a2a95bf7c3e7cf11e1fccee339c3>"
}
```

Relevant result:

```json
{
  "bundleFingerprint": "51889f2fcc5745e0b63450a06c21b2c26184a2a95bf7c3e7cf11e1fccee339c3",
  "freshness": "CURRENT",
  "severity": "NONE",
  "changes": [],
  "checkedAgainstProjectPosition": 42
}
```

### 4. `mcp__larp__larp_propose` (`larp_propose`)

Exact input:

```json
{
  "commandType": "decision.propose_change",
  "targetId": "decision:auth",
  "expectedStreamVersion": 2,
  "payload": {
    "statement": "Use OAuth2 authorization-code flow with PKCE using the S256 code challenge method."
  },
  "reason": "Clarify the authentication decision for a public-client-safe authorization-code implementation."
}
```

Exact result:

```json
{
  "proposalId": "proposal:d29bd255-e1da-43b9-a62b-fa25c34e2499",
  "projectId": "demo",
  "projectPositionObserved": 42,
  "projectFileHashObserved": "b3c428b59e3d8daaa6084522222988d653dd730a4b25c8d5171a362ce36974ce",
  "commandType": "decision.propose_change",
  "targetId": "decision:auth",
  "payload": {
    "statement": "Use OAuth2 authorization-code flow with PKCE using the S256 code challenge method."
  },
  "expectedStreamVersion": 2,
  "reason": "Clarify the authentication decision for a public-client-safe authorization-code implementation.",
  "actor": {
    "kind": "MCP_CLIENT",
    "name": "codex-mcp-client",
    "version": "0.145.0-alpha.18"
  },
  "status": "PROPOSED",
  "semanticMutationApplied": false,
  "governanceRequired": true
}
```

## Runtime proposal journal evidence

Before step 1, `.larp` did not exist in the workspace. After step 4:

- `.larp/runtime/proposals.jsonl` exists.
- It contains exactly one line.
- That line contains proposal ID `proposal:d29bd255-e1da-43b9-a62b-fa25c34e2499` and matches the proposal receipt.

Exact journal line:

```json
{"proposalId":"proposal:d29bd255-e1da-43b9-a62b-fa25c34e2499","projectId":"demo","projectPositionObserved":42,"projectFileHashObserved":"b3c428b59e3d8daaa6084522222988d653dd730a4b25c8d5171a362ce36974ce","commandType":"decision.propose_change","targetId":"decision:auth","payload":{"statement":"Use OAuth2 authorization-code flow with PKCE using the S256 code challenge method."},"expectedStreamVersion":2,"reason":"Clarify the authentication decision for a public-client-safe authorization-code implementation.","actor":{"kind":"MCP_CLIENT","name":"codex-mcp-client","version":"0.145.0-alpha.18"},"status":"PROPOSED","semanticMutationApplied":false,"governanceRequired":true}
```

## Before/after semantic-event evidence

Before the MCP sequence:

- `.larp` did not exist, so `.larp/runtime/semantic_events.jsonl` did not exist.
- Semantic-event file count in the runtime directory: `0`.
- Project position reported at step 1: `42`.
- Project file SHA-256 reported at step 1: `b3c428b59e3d8daaa6084522222988d653dd730a4b25c8d5171a362ce36974ce`.

After the proposal:

- `.larp/runtime/semantic_events.jsonl` is absent.
- The only runtime file is `.larp/runtime/proposals.jsonl`.
- Semantic-event file count in the runtime directory: `0`.
- `examples/project.json` SHA-256 is still `b3c428b59e3d8daaa6084522222988d653dd730a4b25c8d5171a362ce36974ce`.
- The receipt reports `projectPositionObserved: 42` and `semanticMutationApplied: false`.

Therefore, the proposal appended a proposal journal record but created no `SemanticEvent` and made no semantic change to the project fixture.

## Criterion results

| Criterion | Evidence | Result |
|---|---|---|
| `project = demo` | `larp_status.projectId` is `demo`; context and proposal also report `demo`. | **PASS** |
| `semanticMutationAllowed = false` | `larp_status.semanticMutationAllowed` is `false`. | **PASS** |
| Context contains `decision:auth` | Step 2 `decisions` includes ID `decision:auth`. | **PASS** |
| Context contains `unknown:refresh-policy` | Step 2 `unknowns` includes ID `unknown:refresh-policy`. | **PASS** |
| Context verification returns `CURRENT` | Step 3 returned `freshness: CURRENT`, `severity: NONE`, and no changes. | **PASS** |
| Proposal returns `status = PROPOSED` | Step 4 returned `status: PROPOSED`. | **PASS** |
| `semanticMutationApplied = false` | Step 4 returned `semanticMutationApplied: false`. | **PASS** |
| `governanceRequired = true` | Step 4 returned `governanceRequired: true`. | **PASS** |
| `.larp/runtime/proposals.jsonl` contains the proposal | The sole journal line contains the exact proposal ID, target, payload, actor, and receipt flags. | **PASS** |
| No `SemanticEvent` was created by the proposal | No event file existed before; `.larp/runtime/semantic_events.jsonl` remains absent afterward; project hash is unchanged. | **PASS** |

## Implementation integrity

No adapter implementation file was modified. The verification created only the adapter-managed runtime proposal journal and this evidence report.
