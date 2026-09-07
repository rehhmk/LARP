# V-01 Independent Verification

Status: VERIFIED

Verified by: ChatGPT
Evidence commit: `49a4ead2a6148de38fc29ef4f56a2d2ccaee4ab1`
Verification date: 2026-09-07

## Result

V-01 satisfies the required end-to-end real-agent causal chain.

Verified evidence:

- real Codex Desktop agent execution against `LARP_V01`;
- B0 hydrated CURRENT and used for concrete work;
- first governed proposal created without semantic mutation;
- HUMAN approval #1 pre-existed before apply;
- first apply produced one accepted `decision.changed` event and advanced project position `0 -> 1`, decision stream `1 -> 2`;
- exact B0 then verified `STALE_BLOCKING` on `decision:auth`;
- proposal bound to stale B0 was rejected with `CONTEXT_STALE_BLOCKING` and zero proposal-journal append;
- B0 concrete implementation failed after semantic drift;
- B1 rehydrated with a different fingerprint and verified CURRENT;
- Codex adapted the concrete artifact and verifier passed;
- fresh B1-bound proposal was non-mutating and reached HUMAN gate #2;
- HUMAN approval #2 pre-existed before final apply and remained byte-for-byte unchanged;
- final governed apply returned APPLIED, validation ACCEPTED, transaction COMMITTED, exactly one new `decision.changed` SemanticEvent;
- project position advanced `1 -> 2`, decision stream `2 -> 3`;
- final event causation references `proposal:7aaed0ea-144e-47ff-b7ae-154c5347ed97` and correlation references `approval:v01-final-human-02`;
- B1 then verified `STALE_BLOCKING` at project position 2;
- B2 rehydrated at project position 2 with decision version 3 and verified CURRENT with severity NONE and no changes;
- concrete artifact advanced `governingDecisionVersion: 2 -> 3` and preserved the accepted auth policy;
- final journal counts are `2 proposals / 2 semantic events / 2 transactions / 2 validation receipts / 2 human approvals`;
- regression suites pass: adapter 15/15, governance 9/9, V-01 5/5.

## Coverage effect

- Verified criteria: `21 / 25 -> 22 / 25`
- Verified coverage: `84 / 100 -> 88 / 100`
- V-01: VERIFIED
- M6 Functional Vertical Slice: remains ACTIVE until V-02 is verified.
- Next criterion: V-02.

## Evidence anchors

- `PHASE3_AGENT_EVIDENCE.md`
- `FINAL_APPLY_RESULT.json`
- `B1_STALE_AFTER_FINAL.json`
- `B2.json`
- `B2_CURRENT_VERIFICATION.json`
- `FINAL_JOURNAL_COUNTS.json`
- `REGRESSION_TEST_OUTPUT.txt`
- `VERTICAL_SLICE/v01/work/auth-policy.js`

This verification is based on committed GitHub evidence, not chat claims or local-only output.
