# V-01 — Codex Desktop real-agent run · Phase 3 FINAL

Status: READY AFTER HUMAN GATE #2

Pre-existing evidence/approval anchors:

- Phase 2 evidence commit: `ca6d3a230ec488e1ff36cbacdab9a59fba49c3d9`
- Human approval #2 commit: `006fc870855dc25698897ad88d6d4d057b903f00`
- approval file: `VERTICAL_SLICE/v01/evidence/run-20260907-01/HUMAN_APPROVAL_02_FINAL.json`
- proposal: `proposal:7aaed0ea-144e-47ff-b7ae-154c5347ed97`
- approved statement: `Use OAuth2 authorization-code flow with PKCE S256 and require DPoP-bound access tokens for public clients.`

This phase applies the already-approved final proposal, proves B1 becomes stale after the governed semantic event, rehydrates B2, continues the concrete implementation against B2, preserves all final receipts, runs regressions, and commits the complete evidence.

## Hard rules

- Continue the existing V-01 run. **Do not reset it.**
- Use only `LARP_V01` for LARP MCP calls.
- Do not create, edit, replace, or synthesize HUMAN approval receipts.
- The pre-existing approval #2 file must be byte-for-byte unchanged throughout this phase.
- Do not create a new semantic proposal unless this runbook explicitly requires one. No third human gate is expected.
- If local runtime state cannot be reconciled with the committed Phase 2 evidence, STOP FAIL rather than reconstructing history.

## 1. Preflight and immutable approval

1. From repository root inspect `git status`.
2. Fetch/pull `main` with fast-forward only. Preserve the existing V-01 runtime under `VERTICAL_SLICE/v01/run/`; do not run `reset:real`.
3. Require HEAD includes:
   - `ca6d3a230ec488e1ff36cbacdab9a59fba49c3d9`
   - `006fc870855dc25698897ad88d6d4d057b903f00`
4. Read `HUMAN_APPROVAL_02_FINAL.json`. Require:
   - `approved = true`
   - `actor.kind = HUMAN`
   - `proposalId = proposal:7aaed0ea-144e-47ff-b7ae-154c5347ed97`
   - exact approved statement above
   - `semanticMutationApplied = false`.
5. Compute and record SHA-256 of the approval file before execution. Do not edit it.
6. Inspect the local proposal journal and require exactly one entry with this proposal id matching committed `FRESH_PROPOSAL_RECEIPT.json`:
   - expected stream version `2`
   - B1 context fingerprint `d167bcd1195e50846634efddbb9d491906132ace0ac912809dae559d54b4ee1c`
   - context freshness `CURRENT`
   - status `PROPOSED`
   - semanticMutationApplied `false`
   - governanceRequired `true`.

## 2. Apply the final human-approved proposal

7. Record pre-apply counts. Expected baseline:
   - proposals = `2`
   - semantic events = `1`
   - semantic transactions = `1`
   - validation receipts = `1`
   - human approvals = `1`.
8. Run exactly:

```bash
node ADAPTER/src/apply-approved-proposal.js \
  --project VERTICAL_SLICE/v01/run/project.json \
  --runtime-dir VERTICAL_SLICE/v01/run/.larp/runtime \
  --proposal proposal:7aaed0ea-144e-47ff-b7ae-154c5347ed97 \
  --approval-file VERTICAL_SLICE/v01/evidence/run-20260907-01/HUMAN_APPROVAL_02_FINAL.json
```

9. Require the governed result:
   - status `APPLIED`
   - project position `1 -> 2`
   - `decision:auth` stream version `2 -> 3`
   - validation result `ACCEPTED`
   - semantic transaction `COMMITTED`
   - exactly one new SemanticEvent
   - event type `decision.changed`
   - event causation = `proposal:7aaed0ea-144e-47ff-b7ae-154c5347ed97`
   - event correlation = `approval:v01-final-human-02`
   - accepted statement exactly matches the human-approved final statement.
10. Require post-apply counts:
   - proposals = `2`
   - semantic events = `2`
   - semantic transactions = `2`
   - validation receipts = `2`
   - human approvals = `2`.

## 3. Prove B1 becomes stale, then rehydrate B2

11. Call `LARP_V01 larp_verify_context` against the exact B1 bundle saved in committed evidence. Supply the full B1 bundle if needed after process restart.
12. Require:
   - freshness = `STALE_BLOCKING`
   - severity = `BLOCK`
   - changed reference includes `decision:auth`
   - checked project position = `2`.
13. Call `LARP_V01 larp_get_context` for:
   - taskId `task:implement-auth`
   - agentId `agent:coding`
   - scopeId `backend`.
14. Persist exact B2 bundle + receipt and require:
   - B2 fingerprint differs from B1
   - B2 source project position = `2`
   - B2 contains `decision:auth` version `3`
   - B2 contains the exact final approved statement.
15. Call `larp_verify_context(B2)` and require `CURRENT`, severity `NONE`, no changes.

## 4. Continue concrete work from B2

16. The current concrete artifact on main should reflect B1:

```js
export const AUTH_POLICY = Object.freeze({
  flow: 'authorization_code',
  pkce: 'S256',
  dpop: true,
  governingDecisionVersion: 2,
});
```

17. Update only `governingDecisionVersion` from `2` to `3`, preserving `flow`, `pkce` and `dpop`.
18. Run:

```bash
node VERTICAL_SLICE/v01/work/verify-auth-policy.js \
  VERTICAL_SLICE/v01/run/project.json \
  VERTICAL_SLICE/v01/work/auth-policy.js
```

Require PASS at project position `2`, decision version `3`, with `dpop=true`.
19. Also mechanically require the artifact's `governingDecisionVersion === 3` (for example by importing it in a small `node -e` assertion).
20. Save the B1 -> B2 work diff as evidence.

## 5. Preserve final evidence

21. Copy/save into `VERTICAL_SLICE/v01/evidence/run-20260907-01/` at minimum:
   - `HUMAN_APPROVAL_02_FINAL.json` (already tracked; do not edit)
   - final apply result
   - B1 stale verification after final event
   - exact B2 bundle/receipt
   - B2 CURRENT verification
   - B1 -> B2 work diff
   - final work verifier PASS
   - final project snapshot
   - complete proposal journal snapshot
   - complete human approval journal snapshot
   - complete semantic validation receipt journal snapshot
   - complete semantic transaction journal snapshot
   - complete semantic event journal snapshot
   - final journal counts.
22. Recompute SHA-256 of `HUMAN_APPROVAL_02_FINAL.json` and require it equals the pre-execution hash.
23. Create `PHASE3_AGENT_EVIDENCE.md` with:
   - Codex Desktop thread/session identity
   - exact approval and proposal ids
   - before/after counts
   - final validation/transaction/event ids
   - B1 stale receipt
   - B2 fingerprint/current receipt
   - work continuation diff/test result
   - approval hash before/after
   - condition-by-condition PASS/FAIL.
24. Create `V01_EXTERNAL_AGENT_EVIDENCE.md` summarizing the complete causal chain across Phase 1, Phase 2 and Phase 3, referencing the exact detailed evidence files rather than replacing them.

## 6. Regression proof

25. Run:

```bash
cd ADAPTER
npm test
node --test test/governance.test.js
cd ../VERTICAL_SLICE/v01
npm test
cd ../..
```

Require all suites PASS. Record raw output or a faithful test-output file in the evidence directory.

## 7. Commit evidence

26. Inspect `git diff` carefully. It is expected to include the final evidence plus `VERTICAL_SLICE/v01/work/auth-policy.js` advancing the governing decision version to `3`.
27. Commit and push all required V-01 final evidence to GitHub `main`.
28. Do not modify either human approval receipt in that commit.

STOP and return exactly:

```text
V01 FINAL EVIDENCE COMMITTED
commit: <exact Git commit SHA>
projectPosition: 2
decisionVersion: 3
B2: CURRENT
```

Do not declare roadmap coverage changed. ChatGPT performs the independent `::verify V-01` against committed GitHub evidence.
