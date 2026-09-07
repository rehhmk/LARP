# V-01 Complete External-Agent Evidence

Status: **PASS — COMPLETE V-01 EXECUTABLE EVIDENCE**

This report summarizes the single real Codex Desktop V-01 execution chain. Detailed receipts remain authoritative and are referenced below.

## Phase 1: B0, concrete work, and first human gate

Codex used only the isolated `LARP_V01` MCP server. `larp_status` confirmed `v01-demo` at position 0 with verified coverage 84 and semantic mutation disabled for the agent surface.

`larp_get_context` produced CURRENT B0 with fingerprint `dda72e83c2aa9a67e2eb8d58f37a5bf6d15b50f47aa6f6d11f0df413d022a5df`. Concrete work began by retaining authorization-code + PKCE S256 + `dpop=false` and explicitly binding the artifact to governing decision version 1. The verifier passed.

The agent created proposal `proposal:27b57160-4559-4966-bee0-1e8ea407c219`, bound to CURRENT B0, requesting the DPoP semantic drift. It was only `PROPOSED`, required governance, and created no SemanticEvent. Execution stopped at human gate #1.

Detailed evidence: `PHASE1_AGENT_EVIDENCE.md`, `B0.json`, `B0_WORK_DIFF.txt`, and `PROPOSALS_BEFORE_DRIFT_APPLY.jsonl`.

## Phase 2: first approval, stale enforcement, B1, and second human gate

Human approval `approval:v01-drift-human-01` pre-existed in commit `5921158f30356c3ecd438cc1ebb829cc648b60f6`. The coding agent did not create or modify it.

The governed apply accepted the proposal and committed `event:49214ffb-db35-4f10-b47a-4da3120d92c3`, advancing project position `0 -> 1` and `decision:auth` version `1 -> 2`.

The exact B0 then became `STALE_BLOCKING` on `decision:auth`. A proposal bound to stale B0 was rejected with `CONTEXT_STALE_BLOCKING`, and the proposal journal count did not change. The concrete B0 policy also failed its semantic verifier because the new decision required DPoP.

Rehydration produced CURRENT B1 with fingerprint `d167bcd1195e50846634efddbb9d491906132ace0ac912809dae559d54b4ee1c`. The code adapted to `dpop=true` and governing version 2, and verification passed.

The agent created fresh proposal `proposal:7aaed0ea-144e-47ff-b7ae-154c5347ed97`, bound to CURRENT B1. It remained non-mutating and governance-required, so execution stopped at human gate #2.

Detailed evidence: `PHASE2_AGENT_EVIDENCE.md`, `DRIFT_APPLY_RESULT.json`, `B0_STALE_VERIFICATION.json`, `STALE_PROPOSAL_REJECTION.txt`, `B1.json`, `B1_VERIFICATION.json`, `B0_TO_B1_WORK_DIFF.txt`, `B1_WORK_VERIFIER_PASS.txt`, and `FRESH_PROPOSAL_RECEIPT.json`.

## Phase 3: final approval, B2, and continuation

Human approval `approval:v01-final-human-02` pre-existed in commit `006fc870855dc25698897ad88d6d4d057b903f00`. Its SHA-256 remained `404adb304d492f447bbb14f79026781fd341935ff64b4b29a959fa0e8b0aaffe`; the coding agent did not create or modify it.

The final governed apply accepted the exact proposal and committed `event:8f2a8ac2-24c6-4b92-b78a-71239ac2519b`, advancing project position `1 -> 2` and `decision:auth` version `2 -> 3`. Final counts are two proposals, two human approvals, two validations, two transactions, and two events.

B1 then became `STALE_BLOCKING` on `decision:auth`. Rehydration produced CURRENT B2 with fingerprint `6e10446e695af20b3d64d674ce51f6354fc92b51939c9be971c123dda5349b4d`, source position 2, decision version 3, and the exact approved public-client DPoP statement.

Concrete work continued from B2 by changing only `governingDecisionVersion: 2 -> 3`; semantic and explicit-version verification passed.

Detailed evidence: `PHASE3_AGENT_EVIDENCE.md`, `FINAL_APPLY_RESULT.json`, `B1_STALE_AFTER_FINAL.json`, `B2.json`, `B2_CURRENT_VERIFICATION.json`, `B1_TO_B2_WORK_DIFF.txt`, `FINAL_WORK_VERIFIER_PASS.txt`, and all `FINAL_*.jsonl` snapshots.

## Authority and causal integrity

- LARP calls used only the real `LARP_V01` MCP server.
- No MCP call was simulated.
- The agent created no HUMAN approval.
- Both approvals pre-existed as separately committed human-control artifacts and remained unchanged.
- Every proposal was context-bound and non-mutating.
- Both semantic changes passed deterministic validation and committed exactly one linked SemanticEvent each.
- Stale-context rejection occurred before journal append.
- Concrete implementation visibly adapted across B0, B1, and B2.

## Regression proof

The deterministic local harness was decoupled from the evolving real-run artifact by using its existing initial policy fixture. The full required regression sequence then passed: adapter `15/15`, governance `9/9`, and V-01 local causal chain `5/5`. Raw output and the initial harness-coupling failure are preserved in `REGRESSION_TEST_OUTPUT.txt`.

This evidence set is finalized by the GitHub `main` commit containing this report.
