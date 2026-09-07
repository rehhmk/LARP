# V-01 — Codex Desktop real-agent run

Status: READY FOR EXTERNAL EXECUTION

This runbook executes only the real-agent phases up to the **first HUMAN gate**. It must not synthesize or edit a human approval.

## 0. Prepare local state

From repository root:

```bash
git switch main
git pull --ff-only
cd VERTICAL_SLICE/v01
npm run reset:real
cd ../..
```

Expected reset output:

- `projectId = v01-demo`
- `projectPosition = 0`
- `decisionAuthVersion = 1`

The disposable runtime lives at:

```text
VERTICAL_SLICE/v01/run/project.json
VERTICAL_SLICE/v01/run/.larp/runtime/
```

## 1. MCP server for this slice

Create a **separate** Codex MCP server named `LARP_V01` so the already-verified A-01/A-02 server does not need to be modified.

For a checkout at `/Users/enzotriches/Documents/LARP`:

```text
Name: LARP_V01
Type: STDIO
Command: node
Working directory: /Users/enzotriches/Documents/LARP
Arguments:
  /Users/enzotriches/Documents/LARP/ADAPTER/src/server.js
  --project
  /Users/enzotriches/Documents/LARP/VERTICAL_SLICE/v01/run/project.json
  --runtime-dir
  /Users/enzotriches/Documents/LARP/VERTICAL_SLICE/v01/run/.larp/runtime
  --coverage
  84
```

Restart Codex Desktop after saving the MCP server. Open a new thread in the LARP repository.

## 2. Agent phase: B0 → drift proposal → STOP

Give Codex the prompt below exactly. Codex must use **only `LARP_V01` LARP tools** for this run.

```text
Execute V-01 only up to the FIRST HUMAN GATE.

Source of truth:
- VERTICAL_SLICE/V01_FUNCTIONAL_VERTICAL_SLICE_PROTOCOL.md
- VERTICAL_SLICE/v01/CODEX_REAL_RUN.md
- GitHub main for committed executable evidence

Hard rules:
- Use only the LARP_V01 MCP server for LARP calls in this run.
- Do not use the older demo LARP MCP server.
- Do not simulate MCP calls.
- Do not create, edit, or synthesize any HUMAN approval receipt.
- Do not apply a semantic mutation yourself.
- Stop immediately after creating the governed drift proposal and report its exact proposalId.

Preflight:
1. Confirm repository HEAD and git status.
2. Confirm VERTICAL_SLICE/v01/run/project.json exists.
3. Call LARP_V01 larp_status.
4. Require projectId=v01-demo, projectPosition=0, verifiedCoverage=84, semanticMutationAllowed=false. If not, STOP FAIL.

B0 hydration:
5. Call larp_get_context with taskId=task:implement-auth, agentId=agent:coding, scopeId=backend.
6. Persist the exact returned bundle and receipt locally as VERTICAL_SLICE/v01/run/B0.json.
7. Call larp_verify_context on B0 and require CURRENT.
8. Record B0 bundleFingerprint.

Concrete work begins from B0:
9. Read decision:auth from B0 and VERTICAL_SLICE/v01/work/auth-policy.js.
10. Modify auth-policy.js in a small, concrete way that remains correct under B0: preserve flow='authorization_code', pkce='S256', dpop=false, and add `governingDecisionVersion: 1` to make the governing state explicit in the artifact.
11. Run:
   node VERTICAL_SLICE/v01/work/verify-auth-policy.js VERTICAL_SLICE/v01/run/project.json VERTICAL_SLICE/v01/work/auth-policy.js
12. Require PASS.
13. Capture `git diff -- VERTICAL_SLICE/v01/work/auth-policy.js` into VERTICAL_SLICE/v01/run/B0_WORK_DIFF.txt.

Create governed semantic drift proposal:
14. Call larp_propose bound to B0 with:
    commandType = decision.propose_change
    targetId = decision:auth
    expectedStreamVersion = 1
    payload.statement = "Use OAuth2 authorization-code flow with PKCE S256 and DPoP-bound access tokens."
    reason = "V-01 governed semantic drift"
    contextBundleFingerprint = B0.bundleFingerprint
15. Require status=PROPOSED, contextFreshnessAtProposal=CURRENT, semanticMutationApplied=false, governanceRequired=true.
16. Confirm proposals.jsonl gained exactly one proposal for this drift and semantic_events.jsonl did not gain an event from this proposal.
17. Create VERTICAL_SLICE/v01/run/PHASE1_AGENT_EVIDENCE.md with the host/thread identity, HEAD SHA, B0 fingerprint, verification receipt, concrete work diff/test result, drift proposal receipt, and journal counts.

STOP.
Do NOT approve or apply the drift proposal.
Return exactly:
V01 FIRST HUMAN GATE
proposalId: <exact id>
statement: Use OAuth2 authorization-code flow with PKCE S256 and DPoP-bound access tokens.
```

## 3. Human gate

The next step is not an agent decision. The exact proposal id must be brought back to the human/project owner for explicit approval.

No V-01 semantic drift may be applied before that approval is persisted separately.

## Why stop here?

This preserves the causal proof:

```text
real Codex + B0
  → concrete work begins
  → proposal exists
  → HUMAN boundary
```

The next phase will use the human-approved drift to make B0 stale, prove stale proposal enforcement, rehydrate B1, adapt the code, and later reach the second human gate.
