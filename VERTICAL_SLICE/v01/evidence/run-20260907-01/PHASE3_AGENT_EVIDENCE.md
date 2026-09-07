# V-01 Phase 3 Real-Agent Evidence

Status: **PASS — FINAL EVIDENCE COMPLETE**

## Execution identity and continuity

- Host: `Codex Desktop`
- Machine: `Enzos-MacBook-Air.local`
- Thread/session: `01a07c5f-5ef0-74a2-8a24-bf90ac476b30`
- LARP MCP server used: `LARP_V01` only
- Phase 3 starting HEAD: `1b03575` (containing Phase 2 evidence commit `ca6d3a230ec488e1ff36cbacdab9a59fba49c3d9` and approval #2 commit `006fc870855dc25698897ad88d6d4d057b903f00`)
- Existing disposable V-01 runtime reconciled byte-for-byte with every committed Phase 2 snapshot; no reset or reconstruction occurred.

## Immutable human approval #2

- File: `HUMAN_APPROVAL_02_FINAL.json`
- Approval ID: `approval:v01-final-human-02`
- Proposal ID: `proposal:7aaed0ea-144e-47ff-b7ae-154c5347ed97`
- Actor kind: `HUMAN`
- Approved statement: `Use OAuth2 authorization-code flow with PKCE S256 and require DPoP-bound access tokens for public clients.`
- `semanticMutationApplied` in approval: `false`
- SHA-256 before execution: `404adb304d492f447bbb14f79026781fd341935ff64b4b29a959fa0e8b0aaffe`
- SHA-256 after execution: `404adb304d492f447bbb14f79026781fd341935ff64b4b29a959fa0e8b0aaffe`
- Git working-tree diff: none

The coding agent did not create, edit, replace, or synthesize either HUMAN approval receipt.

## Final proposal preflight

The live proposal journal matched committed `FRESH_PROPOSAL_RECEIPT.json` exactly and contained one entry for the approved proposal ID:

- Expected stream version: `2`
- B1 fingerprint: `d167bcd1195e50846634efddbb9d491906132ace0ac912809dae559d54b4ee1c`
- Context freshness at proposal: `CURRENT`
- Status: `PROPOSED`
- Semantic mutation applied: `false`
- Governance required: `true`

## Governed final apply

Before apply:

| Journal | Count |
| --- | ---: |
| proposals | 2 |
| semantic events | 1 |
| semantic transactions | 1 |
| validation receipts | 1 |
| human approvals | 1 |

The exact Phase 3 command consumed the immutable approval and returned `APPLIED`.

- Project position: `1 -> 2`
- `decision:auth` stream version: `2 -> 3`
- Validation: `validation:8f2a8ac2-24c6-4b92-b78a-71239ac2519b`, `ACCEPTED`
- Transaction: `tx:8f2a8ac2-24c6-4b92-b78a-71239ac2519b`, `COMMITTED`, event count `1`
- Event: `event:8f2a8ac2-24c6-4b92-b78a-71239ac2519b`
- Event type: `decision.changed`
- Event causation: `proposal:7aaed0ea-144e-47ff-b7ae-154c5347ed97`
- Event correlation: `approval:v01-final-human-02`
- Final statement: `Use OAuth2 authorization-code flow with PKCE S256 and require DPoP-bound access tokens for public clients.`

After apply:

| Journal | Count |
| --- | ---: |
| proposals | 2 |
| semantic events | 2 |
| semantic transactions | 2 |
| validation receipts | 2 |
| human approvals | 2 |

Detailed records: `PRE_FINAL_APPLY_COUNTS.json`, `FINAL_APPLY_RESULT.json`, and `FINAL_JOURNAL_COUNTS.json`.

## B1 stale proof and B2 rehydration

The exact committed B1 was verified after the final event:

- Fingerprint: `d167bcd1195e50846634efddbb9d491906132ace0ac912809dae559d54b4ee1c`
- Freshness: `STALE_BLOCKING`
- Severity: `BLOCK`
- Changed reference: `decision:auth`
- Reason: `SEMANTIC_FINGERPRINT_CHANGED`
- Checked project position: `2`

Exact receipt: `B1_STALE_AFTER_FINAL.json`.

The real `LARP_V01 larp_get_context` call produced B2:

- B2 fingerprint: `6e10446e695af20b3d64d674ce51f6354fc92b51939c9be971c123dda5349b4d`
- B2 differs from B1.
- Source project position: `2`
- `decision:auth` version: `3`
- Decision statement exactly matches the final human-approved statement.
- `LARP_V01 larp_verify_context(B2)`: `CURRENT`, severity `NONE`, changes `[]`.

Exact records: `B2.json` and `B2_CURRENT_VERIFICATION.json`.

## Concrete continuation from B2

Only `governingDecisionVersion` changed in the concrete artifact, from `2` to `3`; `flow='authorization_code'`, `pkce='S256'`, and `dpop=true` were preserved.

- Semantic-aware verifier: `PASS`
- Project position: `2`
- Decision version: `3`
- Expected DPoP: `true`
- Mechanical `governingDecisionVersion === 3` assertion: `PASS`

Exact records: `B1_TO_B2_WORK_DIFF.txt`, `FINAL_WORK_VERIFIER_PASS.txt`, and `FINAL_VERSION_ASSERTION_PASS.txt`.

## Final preserved evidence

- Final project: `FINAL_PROJECT.json`
- Proposals: `FINAL_PROPOSALS.jsonl`
- Human approvals: `FINAL_HUMAN_APPROVALS.jsonl`
- Validation receipts: `FINAL_VALIDATION_RECEIPTS.jsonl`
- Transactions: `FINAL_TRANSACTIONS.jsonl`
- Semantic events: `FINAL_SEMANTIC_EVENTS.jsonl`

## Condition-by-condition result

| Condition | Result |
| --- | --- |
| Existing run continued without reset | PASS |
| Phase 2 runtime reconciled with committed evidence | PASS |
| Approval #2 pre-existed and matched the exact proposal | PASS |
| Approval #2 byte-for-byte unchanged | PASS |
| Pre-apply counts matched `2/1/1/1/1` | PASS |
| Governed final apply returned `APPLIED` | PASS |
| Position and decision version advanced `1->2` and `2->3` | PASS |
| Validation accepted and transaction committed | PASS |
| Exactly one correctly linked final event appended | PASS |
| Post-apply counts matched `2/2/2/2/2` | PASS |
| B1 became stale-blocking on `decision:auth` | PASS |
| B2 differs, contains final state, and verifies CURRENT | PASS |
| Concrete artifact continued to governing version 3 | PASS |
| Semantic and explicit-version work checks passed | PASS |
| Required final receipts and snapshots preserved | PASS |
| Regression suites | PASS: adapter 15/15, governance 9/9, V-01 5/5 |
| Final GitHub evidence commit | PASS when finalized by the GitHub `main` commit containing this report |

## Regression proof

The initial V-01 regression exposed a deterministic-harness coupling: the local test copied the evolving real-run artifact as its B0 seed. The harness was corrected to copy the existing immutable `fixture/auth-policy.initial.js`, matching `reset:real`; no runtime receipt or HUMAN approval was touched.

The complete required regression sequence was rerun in order:

- Adapter: `15/15` PASS
- Governance: `9/9` PASS
- V-01 local causal chain: `5/5` PASS

The initial failure, diagnosis, correction, and final raw outputs are preserved in `REGRESSION_TEST_OUTPUT.txt`.
