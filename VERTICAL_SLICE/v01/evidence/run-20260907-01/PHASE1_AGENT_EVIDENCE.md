# V-01 Phase 1 Real-Agent Evidence

Status: **FIRST HUMAN GATE REACHED**

## Execution identity

- Host: `Codex Desktop`
- Machine: `Enzos-MacBook-Air.local`
- Thread: `01a07c5f-5ef0-74a2-8a24-bf90ac476b30`
- LARP MCP server used: `LARP_V01` only
- Repository HEAD: `539d00f21090456c117fddb7955a1d82e63812ca`
- Repository status at preflight: clean `main`, tracking `origin/main`

## Preflight

`LARP_V01 larp_status` returned:

```json
{
  "adapterVersion": "0.2.0",
  "projectId": "v01-demo",
  "projectPosition": 0,
  "projectFileHash": "639ccb2704254bcb6559b1e2bfae0cf2c594ae3d154f6963fac37b5be84f9824",
  "verifiedCoverage": 84,
  "semanticMutationAllowed": false,
  "taskCounts": {
    "READY": 1
  }
}
```

## B0 hydration and verification

- Exact bundle and compilation receipt: `VERTICAL_SLICE/v01/run/B0.json`
- B0 bundle fingerprint: `dda72e83c2aa9a67e2eb8d58f37a5bf6d15b50f47aa6f6d11f0df413d022a5df`
- B0 source project position: `0`
- Governing `decision:auth` version: `1`
- Governing statement: `Use OAuth2 authorization-code flow with PKCE using the S256 code challenge method.`

Exact `LARP_V01 larp_verify_context` result:

```json
{
  "bundleFingerprint": "dda72e83c2aa9a67e2eb8d58f37a5bf6d15b50f47aa6f6d11f0df413d022a5df",
  "freshness": "CURRENT",
  "severity": "NONE",
  "changes": [],
  "checkedAgainstProjectPosition": 0
}
```

## Concrete work from B0

`VERTICAL_SLICE/v01/work/auth-policy.js` preserves:

- `flow: 'authorization_code'`
- `pkce: 'S256'`
- `dpop: false`

It adds `governingDecisionVersion: 1` to make the governing state explicit.

The exact work diff is persisted at `VERTICAL_SLICE/v01/run/B0_WORK_DIFF.txt`.

Verifier command:

```bash
node VERTICAL_SLICE/v01/work/verify-auth-policy.js VERTICAL_SLICE/v01/run/project.json VERTICAL_SLICE/v01/work/auth-policy.js
```

Exact result:

```json
{"status":"PASS","projectId":"v01-demo","projectPosition":0,"decisionVersion":1,"expectsDpop":false,"authPolicy":{"flow":"authorization_code","pkce":"S256","dpop":false,"governingDecisionVersion":1}}
```

Exit status: `0`.

## Governed drift proposal

The following receipt was returned by the real `LARP_V01 larp_propose` call and persisted once to `proposals.jsonl`:

```json
{
  "proposalId": "proposal:27b57160-4559-4966-bee0-1e8ea407c219",
  "projectId": "v01-demo",
  "projectPositionObserved": 0,
  "projectFileHashObserved": "639ccb2704254bcb6559b1e2bfae0cf2c594ae3d154f6963fac37b5be84f9824",
  "commandType": "decision.propose_change",
  "targetId": "decision:auth",
  "payload": {
    "statement": "Use OAuth2 authorization-code flow with PKCE S256 and DPoP-bound access tokens."
  },
  "expectedStreamVersion": 1,
  "reason": "V-01 governed semantic drift",
  "contextBundleFingerprint": "dda72e83c2aa9a67e2eb8d58f37a5bf6d15b50f47aa6f6d11f0df413d022a5df",
  "contextSourceProjectPosition": 0,
  "contextFreshnessAtProposal": "CURRENT",
  "contextSeverityAtProposal": "NONE",
  "contextDrift": [],
  "actor": {
    "kind": "MCP_CLIENT",
    "name": "codex-mcp-client",
    "version": "0.145.0-alpha.30"
  },
  "status": "PROPOSED",
  "semanticMutationApplied": false,
  "governanceRequired": true
}
```

## Journal counts at the gate

- `proposals.jsonl`: exactly `1` record, the proposal above.
- `semantic_events.jsonl`: absent; therefore exactly `0` events were emitted by this proposal.
- No HUMAN approval receipt was created, edited, or synthesized.
- No semantic mutation was applied.

Execution stops here at the first HUMAN gate.
