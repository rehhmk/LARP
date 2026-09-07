# V-01 Phase 2 Real-Agent Evidence

Status: **SECOND HUMAN GATE REACHED**

## Execution identity and continuity

- Host: `Codex Desktop`
- Machine: `Enzos-MacBook-Air.local`
- Thread: `01a07c5f-5ef0-74a2-8a24-bf90ac476b30`
- LARP MCP server used: `LARP_V01` only
- Phase 2 starting HEAD after fast-forward: `869428fdc9d932cee66798f6e7066d6f56431805`
- The existing V-01 run was continued without reset.
- The Phase 1 work change in `VERTICAL_SLICE/v01/work/auth-policy.js` was preserved.

## Human approval #1 boundary

The pre-existing tracked approval was read from:

`VERTICAL_SLICE/v01/evidence/run-20260907-01/HUMAN_APPROVAL_01_DRIFT.json`

- Introducing commit: `5921158f30356c3ecd438cc1ebb829cc648b60f6`
- Approval ID: `approval:v01-drift-human-01`
- Approved: `true`
- Actor kind: `HUMAN`
- Proposal ID: `proposal:27b57160-4559-4966-bee0-1e8ea407c219`
- SHA-256 before and after Phase 2: `637ce58cd470b7fae917c9b10be3c2b2a407d7299bcda29797bb3469cf2d27fe`
- Git diff after Phase 2: none

The coding agent did not create, edit, replace, or synthesize this or any other HUMAN approval receipt.

## Preserved Phase 1 evidence

The disposable Phase 1 evidence was copied into this tracked evidence directory before apply:

- `B0.json`
- `B0_WORK_DIFF.txt`
- `PHASE1_AGENT_EVIDENCE.md`
- `PROPOSALS_BEFORE_DRIFT_APPLY.jsonl`

B0 fingerprint: `dda72e83c2aa9a67e2eb8d58f37a5bf6d15b50f47aa6f6d11f0df413d022a5df`.

The proposal journal contained exactly one matching drift proposal before apply. It was `PROPOSED`, bound to CURRENT B0, non-mutating, governance-required, expected `decision:auth` version 1, and carried the approved DPoP statement.

## Approved drift apply

Pre-apply journal counts:

| Journal | Count |
| --- | ---: |
| proposals | 1 |
| semantic events | 0 |
| semantic transactions | 0 |
| validation receipts | 0 |
| human approvals | 0 |

The documented apply command was run with the pre-existing approval. A sandboxed attempt was denied before the first runtime journal write (`EPERM`); counts were rechecked and remained identical. The same command then ran with filesystem permission and returned `APPLIED`.

Persisted apply result:

- Project position: `0 -> 1`
- `decision:auth` version: `1 -> 2`
- Validation: `ACCEPTED`
- Transaction: `tx:49214ffb-db35-4f10-b47a-4da3120d92c3`, `COMMITTED`, event count `1`
- Event: `event:49214ffb-db35-4f10-b47a-4da3120d92c3`
- Event type: `decision.changed`
- Causation: `proposal:27b57160-4559-4966-bee0-1e8ea407c219`
- Correlation: `approval:v01-drift-human-01`
- Accepted statement: `Use OAuth2 authorization-code flow with PKCE S256 and DPoP-bound access tokens.`

Post-apply counts were proposals `1`, semantic events `1`, semantic transactions `1`, validation receipts `1`, and human approvals `1`.

Exact receipts and snapshots are retained in:

- `DRIFT_APPLY_RESULT.json`
- `HUMAN_APPROVALS_AFTER_DRIFT.jsonl`
- `SEMANTIC_VALIDATION_RECEIPTS_AFTER_DRIFT.jsonl`
- `SEMANTIC_TRANSACTIONS_AFTER_DRIFT.jsonl`
- `SEMANTIC_EVENTS_AFTER_DRIFT.jsonl`
- `PROJECT_AFTER_DRIFT.json`

## B0 stale-context enforcement

`LARP_V01 larp_verify_context` on the exact B0 returned:

- Freshness: `STALE_BLOCKING`
- Severity: `BLOCK`
- Checked project position: `1`
- Blocking changed reference: `decision:auth`
- Reason: `SEMANTIC_FINGERPRINT_CHANGED`

The exact result is in `B0_STALE_VERIFICATION.json`.

The proposal count was `1` immediately before the stale attempt. A harmless proposal bound to the exact stale B0 bundle and fingerprint, with expected stream version 2, was rejected by `LARP_V01` with `CONTEXT_STALE_BLOCKING`. The proposal count remained `1`; no entry was appended. The rejection receipt is in `STALE_PROPOSAL_REJECTION.txt`.

The semantic-aware work verifier then failed at exit status 1 because the B0 implementation had `dpop=false` while the accepted decision required DPoP. Exact output is in `B0_WORK_VERIFIER_FAIL.txt`.

## B1 rehydration and concrete adaptation

- B1 bundle/receipt: `B1.json`
- B1 fingerprint: `d167bcd1195e50846634efddbb9d491906132ace0ac912809dae559d54b4ee1c`
- B1 differs from B0.
- B1 source project position: `1`
- B1 contains `decision:auth` version `2` and the DPoP statement.
- `LARP_V01 larp_verify_context(B1)` returned `CURRENT`, severity `NONE`, with no changes.

The concrete policy was adapted to:

```js
export const AUTH_POLICY = Object.freeze({
  flow: 'authorization_code',
  pkce: 'S256',
  dpop: true,
  governingDecisionVersion: 2,
});
```

The semantic-aware verifier passed at project position 1 and decision version 2. Exact verification and work evidence are in:

- `B1_VERIFICATION.json`
- `B1_WORK_VERIFIER_PASS.txt`
- `B0_TO_B1_WORK_DIFF.txt`

## Fresh final proposal and second human gate

The real `LARP_V01 larp_propose` call bound to CURRENT B1 returned:

- Proposal ID: `proposal:7aaed0ea-144e-47ff-b7ae-154c5347ed97`
- Status: `PROPOSED`
- Context freshness: `CURRENT`
- Semantic mutation applied: `false`
- Governance required: `true`
- Expected target stream version: `2`
- Statement: `Use OAuth2 authorization-code flow with PKCE S256 and require DPoP-bound access tokens for public clients.`

Final second-gate counts:

| Journal | Count |
| --- | ---: |
| proposals | 2 |
| semantic events | 1 |
| semantic transactions | 1 |
| validation receipts | 1 |
| human approvals | 1 |

Exactly one new proposal was appended, while the semantic-event count remained unchanged. The fresh proposal therefore created no semantic mutation. Exact evidence is in `FRESH_PROPOSAL_RECEIPT.json`, `PROPOSALS_AT_SECOND_GATE.jsonl`, and `SECOND_GATE_COUNTS.json`.

No approval exists or was created for the fresh proposal. Execution stops here at V-01 HUMAN GATE #2.
