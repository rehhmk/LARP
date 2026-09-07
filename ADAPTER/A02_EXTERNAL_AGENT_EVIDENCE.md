# A-02 External-Agent Human-Gate Evidence

Status: **PASS — GOVERNED APPLY COMMITTED**

Verification time: `2026-09-07T15:29:41.581Z`

## Source-of-truth preparation

- Shared repository: `https://github.com/rehhmk/LARP`
- Branch: `main`
- The workspace was clean before synchronization: `## main...origin/main` with no changed or untracked files.
- `git pull --ff-only origin main` fast-forwarded local `main` from `c630a01` to `0c19094`.
- The human approval receipt was already present in the pulled history at commit `345d9cabbcb8cd2314725276096003bdbc85533b` (`test(a02): record explicit human approval for governed proposal`).

## Human approval boundary

The exact pre-existing receipt consumed by this verification was:

`ADAPTER/.larp/control/approvals/a02-d29bd255-human-01.json`

- Approval ID: `approval:a02-d29bd255-human-01`
- Proposal ID: `proposal:d29bd255-e1da-43b9-a62b-fa25c34e2499`
- Approved: `true`
- Actor kind: `HUMAN`
- Actor ID: `human:project-owner`
- SHA-256 before apply: `a2051a5456e3f09e4f023f94eb4e48419fabacd8ce783a46acdc546d0d6cd229`
- SHA-256 after apply: `a2051a5456e3f09e4f023f94eb4e48419fabacd8ce783a46acdc546d0d6cd229`
- `git diff -- ADAPTER/.larp/control/approvals/a02-d29bd255-human-01.json` was empty after apply.

The external coding agent did **not** create or edit this approval receipt. It only pulled the pre-existing committed receipt, read it, verified it, and supplied its path to the governed apply command. No replacement or additional approval was synthesized.

## Deterministic pre-apply state

The proposal journal contained exactly one record and the four A-02 result journals did not yet exist.

- Proposal: `proposal:d29bd255-e1da-43b9-a62b-fa25c34e2499`
- Proposal status: `PROPOSED`
- Governance required: `true`
- Semantic mutation already applied: `false`
- Project: `demo`
- Proposal-observed project position: `42`
- Actual project position: `42`
- Proposal-observed project SHA-256: `b3c428b59e3d8daaa6084522222988d653dd730a4b25c8d5171a362ce36974ce`
- Actual pre-apply project SHA-256: `b3c428b59e3d8daaa6084522222988d653dd730a4b25c8d5171a362ce36974ce`
- Target: `decision:auth`
- Expected stream version: `2`
- Actual target stream version: `2`
- Before statement: `Use OAuth2`
- Approved statement: `Use OAuth2 authorization-code flow with PKCE using the S256 code challenge method.`

## Governed command

The command specified by `A02_HUMAN_GATE_VERIFICATION.md` was executed exactly once from `ADAPTER/`, using the existing receipt:

```bash
node src/apply-approved-proposal.js \
  --project examples/project.json \
  --runtime-dir .larp/runtime \
  --proposal proposal:d29bd255-e1da-43b9-a62b-fa25c34e2499 \
  --approval-file .larp/control/approvals/a02-d29bd255-human-01.json
```

The command exited successfully with status `APPLIED`.

## Persisted validation and semantic transaction

- Validation receipt: `validation:d8857ee3-3b1a-49cf-bb6e-ebc8b0a5bec3`
- Validation result: `ACCEPTED`
- Validation actor kind: `HUMAN`
- Transaction: `tx:d8857ee3-3b1a-49cf-bb6e-ebc8b0a5bec3`
- Transaction status: `COMMITTED`
- Declared transaction event count: `1`
- Persisted events for the transaction: exactly `1`
- Event: `event:d8857ee3-3b1a-49cf-bb6e-ebc8b0a5bec3`
- Event type: `decision.changed`
- Event transaction index: `0`
- Event causation: `proposal:d29bd255-e1da-43b9-a62b-fa25c34e2499`
- Event correlation: `approval:a02-d29bd255-human-01`
- Event actor: `human:project-owner`
- Target stream version: `2 -> 3`
- Project position: `42 -> 43`
- Statement: `Use OAuth2` -> `Use OAuth2 authorization-code flow with PKCE using the S256 code challenge method.`

Each generated result journal contains exactly one JSONL record, and the approval, proposal, validation, transaction, event, and projection IDs/values cross-reference consistently.

## Required evidence artifacts

| Artifact | SHA-256 |
| --- | --- |
| `.larp/control/approvals/a02-d29bd255-human-01.json` | `a2051a5456e3f09e4f023f94eb4e48419fabacd8ce783a46acdc546d0d6cd229` |
| `.larp/runtime/human_approvals.jsonl` | `222a41899b64a7db69ea65bc3cf4c54ac8ec1873e06a9a52b8b84d9a3fc0ad79` |
| `.larp/runtime/semantic_validation_receipts.jsonl` | `b6ec73256980c2650cb853a115df24efb94fb33f403dc262d0765a60adf79559` |
| `.larp/runtime/semantic_transactions.jsonl` | `d50896410711e68beb58eeaa90270820a3e0d0ba08ff4d589db125149e699751` |
| `.larp/runtime/semantic_events.jsonl` | `d5324fe29bdccb930d0b2ab493f4f5ecb31531317310359fb1040ece0416a827` |
| `examples/project.json` | `1522623ad747fbd2f092fad5f9fc95b8e3f75b10d69d999a3ab29f13aff0c052` |

This report is the seventh required artifact: `A02_EXTERNAL_AGENT_EVIDENCE.md`.

## Executable checks

After apply:

- A-02 governance tests: `9/9` passed.
- Context compiler tests: `12/12` passed.
- The first adapter run passed `13/14`; its sole failure was the pre-A-02 hard-coded project-position assertion (`42` expected, `43` actual).
- That assertion was updated to the governed projection position `43`; the full adapter suite was rerun and passed `14/14`.
- A separate persisted-artifact invariant check passed after verifying all required cross-references and state transitions directly from disk.

## Conclusion

The pre-existing human approval authorized the exact proposal. Deterministic validation accepted it, the semantic transaction committed exactly one `decision.changed` event, and the projection advanced only through the specified transition. A-02 external-agent execution therefore passes and is ready for independent inspection from GitHub `main`.
