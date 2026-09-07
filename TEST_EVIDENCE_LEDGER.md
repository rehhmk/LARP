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
- Runtime evidence directory contains `proposals.jsonl` and no `semantic_events.jsonl` before A-02.

Result: **PASS / VERIFIED**.

Roadmap effect: A-01 moved verified criteria from 19/25 to 20/25, i.e. verified coverage from 76/100 to 80/100.

## A-02 — Human-gated proposal -> validated SemanticEvent

**Status: VERIFIED**

Verification basis:

- Human approval commit: `345d9cabbcb8cd2314725276096003bdbc85533b`
- Governed external-apply evidence commit: `82bbdc0f9181737f63c36cc5284d16267889fd1d`
- External agent evidence: `ADAPTER/A02_EXTERNAL_AGENT_EVIDENCE.md`
- Immutable approval receipt: `ADAPTER/.larp/control/approvals/a02-d29bd255-human-01.json`
- Human approval journal: `ADAPTER/.larp/runtime/human_approvals.jsonl`
- Validation receipt: `ADAPTER/.larp/runtime/semantic_validation_receipts.jsonl`
- Semantic transaction: `ADAPTER/.larp/runtime/semantic_transactions.jsonl`
- Semantic event: `ADAPTER/.larp/runtime/semantic_events.jsonl`
- Updated projection fixture: `ADAPTER/examples/project.json`

Independent verification performed by ChatGPT against GitHub `main`:

- The approval receipt exists before the Codex evidence commit and targets exactly `proposal:d29bd255-e1da-43b9-a62b-fa25c34e2499`.
- Approval actor kind is `HUMAN`, actor ID `human:project-owner`, and `approved = true`.
- The Codex evidence commit is a child of the human-approved state and does not modify the pre-existing approval receipt.
- `semantic_validation_receipts.jsonl` records `result = ACCEPTED` for the exact proposal/approval pair.
- Validation records stream version `2 -> 3` and project position `42 -> 43`.
- `semantic_transactions.jsonl` records status `COMMITTED` and `eventCount = 1`.
- `semantic_events.jsonl` contains exactly the governed `decision.changed` event for `decision:auth` with stream version `3`, project position `43`, causation pointing to the proposal, correlation pointing to the human approval, and validation receipt provenance.
- The event payload changes the decision statement from `Use OAuth2` to the approved OAuth2 authorization-code + PKCE S256 statement.
- `ADAPTER/examples/project.json` reflects project position `43`, decision version `3`, and the approved statement.
- External-agent evidence reports the governed apply exited `APPLIED`, A-02 governance tests passed `9/9`, context compiler tests `12/12`, and the adjusted adapter suite `14/14`.

Result: **PASS / VERIFIED**.

Roadmap effect (pending Google Drive ledger synchronization): A-02 moves verified criteria from 20/25 to 21/25, i.e. verified coverage from 80/100 to 84/100. M5 Agent Integration is CLOSED; next technical milestone is M6 Functional Vertical Slice.

## V-01 — Functional vertical slice with semantic drift and rehydration

**Status: ACTIVE — PROTOCOL DEFINED / IMPLEMENTATION GAP IDENTIFIED**

Protocol:

- `VERTICAL_SLICE/V01_FUNCTIONAL_VERTICAL_SLICE_PROTOCOL.md`
- Protocol commit: `0eaf7bbd0fff9e2d33d5c377004819132f0bb3ab`

Focused web research validated three design choices for the slice:

- application context state must remain explicit and independent of MCP transport/session state;
- human-gated execution must be persistable across pause/resume boundaries;
- executable repository-local evidence must be mechanically inspectable by the coding agent and verifier.

Critical gap discovered from the current adapter implementation:

- `larp_propose` captures current project position/hash at proposal time but is not bound to the ContextBundle used for reasoning;
- therefore an agent can reason from stale B0 while the proposal receipt observes newer state;
- V-01 requires deterministic context binding at `larp_propose`: `CURRENT` succeeds, `STALE_NON_BLOCKING` may proceed with warning, `STALE_BLOCKING` is rejected before journal append.

Required V-01 causal proof:

```text
B0 CURRENT
→ real agent starts concrete work
→ human-gated governing decision changes
→ B0 STALE_BLOCKING
→ stale proposal rejected / no journal append
→ rehydrate B1 CURRENT
→ agent adapts concrete work + tests pass
→ fresh proposal
→ HUMAN approval
→ validated SemanticEvent
→ B2 CURRENT reflects final state
```

Coverage remains **21/25 = 84/100** until the complete committed V-01 evidence passes independent verification.

MCP compatibility note: current adapter is 2025-era stdio and modern clients can negotiate/fall back. Native MCP `2026-07-28` dual-era serving is tracked as `GAP-MCP-2026`, not as a blocker for V-01 semantic verification.

Next coherent implementation unit:

1. add ContextBundle binding/freshness enforcement to `larp_propose`;
2. build an isolated V-01 fixture/harness;
3. pass deterministic local tests;
4. then run the real Codex Desktop slice and stop at explicit HUMAN gates.

The roadmap/progress ledger itself remains governed by the Google Drive authority boundary documented in `TESTING_SOURCE_OF_TRUTH.md`. Google Drive was unavailable during this `::next`; GitHub records the executable V-01 protocol/state until Drive synchronization succeeds.
