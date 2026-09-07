# LARP — Test Evidence Ledger

Status: ACTIVE
Repository: `rehhmk/LARP`
Authoritative branch for current test evidence: `main`
Policy: `TESTING_SOURCE_OF_TRUTH.md`

## A-01 — Real coding-agent MCP adapter verification

**Status: VERIFIED**

Verification basis:

- Evidence commit: `c630a01363593eb78b1931abfa3ca527d25ee699`
- External agent evidence: `ADAPTER/A01_EXTERNAL_AGENT_EVIDENCE.md`
- Runtime proposal receipt: `ADAPTER/.larp/runtime/proposals.jsonl`
- Project fixture: `ADAPTER/examples/project.json`
- Adapter tests/report: `ADAPTER/TEST_OUTPUT.txt`, `ADAPTER/TEST_REPORT.md`

Independent verification performed by ChatGPT against GitHub `main`:

- Codex Desktop identified as real coding-agent host.
- Live MCP client identified as `codex-mcp-client` version `0.145.0-alpha.18`.
- Required calls present in order: `larp_status`, `larp_get_context`, `larp_verify_context`, `larp_propose`.
- `larp_status.projectId = demo`.
- `larp_status.semanticMutationAllowed = false`.
- Context contains `decision:auth` and `unknown:refresh-policy`.
- Context verification returns `CURRENT`, severity `NONE`, no changes.
- Proposal receipt returns `status = PROPOSED`, `semanticMutationApplied = false`, `governanceRequired = true`.
- `ADAPTER/.larp/runtime/proposals.jsonl` contains exactly the reported proposal receipt.
- Runtime evidence directory contains `proposals.jsonl` and no `semantic_events.jsonl`.
- SHA-256 independently recomputed for committed `ADAPTER/examples/project.json` equals `b3c428b59e3d8daaa6084522222988d653dd730a4b25c8d5171a362ce36974ce`, matching the external-agent evidence.

Result: **PASS / VERIFIED**.

Roadmap effect (per existing technical baseline): A-01 moves verified criteria from 19/25 to 20/25, i.e. verified coverage from 76/100 to 80/100. The roadmap/progress ledger itself remains governed by the Google Drive authority boundary documented in `TESTING_SOURCE_OF_TRUTH.md`.

## A-02 — Human-gated proposal -> validated SemanticEvent

**Status: ACTIVE — HUMAN APPROVED / EXTERNAL APPLY + VERIFICATION PENDING**

Implementation evidence on GitHub `main`:

- `ADAPTER/src/governance.js`
- `ADAPTER/src/apply-approved-proposal.js`
- `ADAPTER/test/governance.test.js`
- `ADAPTER/A02_TEST_OUTPUT.txt`
- `ADAPTER/A02_IMPLEMENTATION_TEST_REPORT.md`
- `ADAPTER/A02_HUMAN_GATE_VERIFICATION.md`

Local executable implementation result recorded before commit:

- 9 tests
- 9 passed
- 0 failed

Human approval:

- Proposal: `proposal:d29bd255-e1da-43b9-a62b-fa25c34e2499`
- Approval receipt: `ADAPTER/.larp/control/approvals/a02-d29bd255-human-01.json`
- Approval commit: `345d9cabbcb8cd2314725276096003bdbc85533b`
- Actor kind: `HUMAN`
- Approval was created by the human-control side after an explicit user `::approve` command, not by the coding agent.

The test suite verifies that no approval yields zero mutation, an MCP/agent actor cannot self-approve, stale project/stream versions are rejected, an explicit HUMAN approval yields a validated `decision.changed` event, accepted state writes approval/validation/transaction/event journals, and the control CLI consumes an existing approval receipt rather than synthesizing one.

A-02 is **not VERIFIED** yet. The human gate is now satisfied. Codex must pull/inspect GitHub `main`, consume the committed approval receipt through the control CLI, apply the governed proposal, commit the resulting semantic evidence (`human_approvals.jsonl`, validation receipt, semantic transaction, semantic event, updated projection fixture, external-agent evidence), and ChatGPT must independently verify that committed evidence.

Roadmap coverage remains **20/25 = 80/100** until that external evidence is accepted.
