# V-01 — Codex Desktop real-agent run · Phase 2

Status: READY AFTER HUMAN GATE #1

Human approval commit:

- `5921158f30356c3ecd438cc1ebb829cc648b60f6`
- approval file: `VERTICAL_SLICE/v01/evidence/run-20260907-01/HUMAN_APPROVAL_01_DRIFT.json`
- proposal: `proposal:27b57160-4559-4966-bee0-1e8ea407c219`

This phase applies the already-approved drift, proves B0 becomes stale and is blocked, rehydrates B1, adapts concrete work, creates the fresh final proposal, and stops at HUMAN GATE #2.

## Hard rules

- Use only `LARP_V01` for LARP MCP calls.
- Do not create, edit, replace, or synthesize either human approval receipt.
- Do not reset the V-01 run.
- Do not discard B0 or the existing proposal journal.
- Do not continue past HUMAN GATE #2.
- If the exact phase-1 proposal cannot be found in local `run/.larp/runtime/proposals.jsonl`, STOP FAIL.
- If the tracked human approval file does not target that exact proposal, STOP FAIL.

## Phase 2 execution

1. From repository root, inspect `git status` and preserve the phase-1 work change in `VERTICAL_SLICE/v01/work/auth-policy.js`.
2. Fetch/pull `main` so commit `5921158f30356c3ecd438cc1ebb829cc648b60f6` and the human approval file are present. Do not overwrite the phase-1 work file.
3. Read and verify the approval file. Require:
   - `approved = true`
   - `actor.kind = HUMAN`
   - `proposalId = proposal:27b57160-4559-4966-bee0-1e8ea407c219`
4. Inspect local `VERTICAL_SLICE/v01/run/.larp/runtime/proposals.jsonl`. Require exactly one matching drift proposal with:
   - status `PROPOSED`
   - context freshness `CURRENT`
   - semanticMutationApplied `false`
   - governanceRequired `true`
   - expected stream version `1`
   - exact approved statement.
5. Preserve/copy phase-1 evidence from disposable `run/` into `VERTICAL_SLICE/v01/evidence/run-20260907-01/`, including at minimum:
   - B0 bundle/receipt
   - B0 work diff
   - phase-1 agent evidence
   - proposal journal snapshot before apply.

## Apply approved drift

6. Record pre-apply counts for proposals, semantic events, semantic transactions, validation receipts and human approvals.
7. Run:

```bash
node ADAPTER/src/apply-approved-proposal.js \
  --project VERTICAL_SLICE/v01/run/project.json \
  --runtime-dir VERTICAL_SLICE/v01/run/.larp/runtime \
  --proposal proposal:27b57160-4559-4966-bee0-1e8ea407c219 \
  --approval-file VERTICAL_SLICE/v01/evidence/run-20260907-01/HUMAN_APPROVAL_01_DRIFT.json
```

8. Require:
   - status `APPLIED`
   - projectPosition `0 -> 1`
   - `decision:auth` version `1 -> 2`
   - exactly one new semantic event
   - event type `decision.changed`
   - causation references the drift proposal
   - correlation references `approval:v01-drift-human-01`.

## Prove stale enforcement

9. Call `larp_verify_context` on the exact B0 bundle. If the MCP process lost cache, supply the full B0 bundle explicitly.
10. Require `STALE_BLOCKING` and a drift entry for `decision:auth`.
11. Record proposal-journal count.
12. Attempt `larp_propose` using the exact stale B0 bundle/fingerprint. Use a harmless statement and expected stream version `2`.
13. Require `CONTEXT_STALE_BLOCKING`.
14. Require proposal-journal count unchanged after the rejected stale attempt.
15. Run the semantic-aware work verifier against the still-B0 implementation. Require it to FAIL because the accepted decision now requires DPoP while the code still has `dpop=false`.

## Rehydrate B1 and adapt concrete work

16. Call `larp_get_context` for task `task:implement-auth`, agent `agent:coding`, scope `backend`.
17. Save exact B1 bundle/receipt and require:
   - B1 fingerprint differs from B0
   - B1 contains the DPoP decision
   - `larp_verify_context(B1) = CURRENT`.
18. Adapt `VERTICAL_SLICE/v01/work/auth-policy.js` so it reflects B1:

```js
export const AUTH_POLICY = Object.freeze({
  flow: 'authorization_code',
  pkce: 'S256',
  dpop: true,
  governingDecisionVersion: 2,
});
```

19. Run the semantic-aware verifier again and require PASS.
20. Save the B0 -> B1 work diff as evidence.

## Create fresh final proposal

21. Call `larp_propose` bound to B1 with:
   - commandType `decision.propose_change`
   - targetId `decision:auth`
   - expectedStreamVersion `2`
   - payload.statement = `Use OAuth2 authorization-code flow with PKCE S256 and require DPoP-bound access tokens for public clients.`
   - reason = `V-01 fresh post-rehydration proposal`
   - contextBundleFingerprint = B1 fingerprint
   - provide full B1 bundle if required by current MCP process.
22. Require:
   - status `PROPOSED`
   - context freshness `CURRENT`
   - semanticMutationApplied `false`
   - governanceRequired `true`
   - exactly one new proposal journal entry
   - no semantic event created by this fresh proposal.
23. Create/update `VERTICAL_SLICE/v01/evidence/run-20260907-01/PHASE2_AGENT_EVIDENCE.md` with all receipts, fingerprints, before/after counts, verifier failure/pass, work diff and fresh proposal receipt.
24. Commit and push the phase-1 + phase-2 evidence to GitHub `main`. Do not modify the human approval file.

STOP.

Return exactly:

```text
V01 SECOND HUMAN GATE
proposalId: <exact fresh proposal id>
statement: Use OAuth2 authorization-code flow with PKCE S256 and require DPoP-bound access tokens for public clients.
```
