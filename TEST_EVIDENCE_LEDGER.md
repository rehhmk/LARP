# LARP — Test Evidence Ledger

Status: ACTIVE
Repository: `rehhmk/LARP`
Authoritative branch for executable test evidence: `main`
Policy: `TESTING_SOURCE_OF_TRUTH.md`

## Current executable status

- Verified criteria: **22 / 25**
- Verified coverage: **88 / 100**
- M5 Agent Integration: **CLOSED**
- M6 Functional Vertical Slice: **ACTIVE**
- V-01: **VERIFIED**
- Next roadmap criterion: **V-02**

Roadmap/spec authority remains Google Drive. GitHub is authoritative for executable evidence.

---

## A-01 — Real coding-agent MCP adapter verification

**Status: VERIFIED**

Evidence anchors:

- Evidence commit: `c630a01363593eb78b1931abfa3ca527d25ee699`
- External agent evidence: `ADAPTER/A01_EXTERNAL_AGENT_EVIDENCE.md`
- Runtime proposal receipt: `ADAPTER/.larp/runtime/proposals.jsonl`
- Project fixture: `ADAPTER/examples/project.json`
- Adapter tests/report: `ADAPTER/TEST_OUTPUT.txt`, `ADAPTER/TEST_REPORT.md`

Verified result:

- Codex Desktop acted as a real coding-agent host.
- Required MCP calls executed live: `larp_status`, `larp_get_context`, `larp_verify_context`, `larp_propose`.
- Context contained governed Decision/Evidence/Unknown state.
- Freshness returned CURRENT.
- Proposal was persisted as `PROPOSED` with `semanticMutationApplied = false` and `governanceRequired = true`.
- No SemanticEvent was created by proposal creation.

Coverage effect: **19/25 → 20/25; 76/100 → 80/100**.

---

## A-02 — Human-gated proposal → validated SemanticEvent

**Status: VERIFIED**

Evidence anchors:

- Human approval commit: `345d9cabbcb8cd2314725276096003bdbc85533b`
- Governed external-apply evidence commit: `82bbdc0f9181737f63c36cc5284d16267889fd1d`
- Independent verification ledger commit: `abf37e092424c99e9ca92b5c5ecfd2dcf7955966`
- External agent evidence: `ADAPTER/A02_EXTERNAL_AGENT_EVIDENCE.md`
- Approval receipt: `ADAPTER/.larp/control/approvals/a02-d29bd255-human-01.json`
- Human approval journal: `ADAPTER/.larp/runtime/human_approvals.jsonl`
- Validation receipt: `ADAPTER/.larp/runtime/semantic_validation_receipts.jsonl`
- Semantic transaction: `ADAPTER/.larp/runtime/semantic_transactions.jsonl`
- Semantic event: `ADAPTER/.larp/runtime/semantic_events.jsonl`

Verified result:

- Approval pre-existed the governed apply and was explicitly HUMAN.
- Validation returned ACCEPTED.
- Semantic transaction returned COMMITTED with exactly one event.
- Event was `decision.changed`, linked by causation to the proposal and correlation to the approval.
- Projection advanced stream `2 → 3` and project position `42 → 43`.
- Coding agent did not synthesize its own human approval.

Coverage effect: **20/25 → 21/25; 80/100 → 84/100**. M5 Agent Integration CLOSED.

---

## V-01 — Functional vertical slice with semantic drift and rehydration

**Status: VERIFIED**

Protocol and implementation:

- Protocol: `VERTICAL_SLICE/V01_FUNCTIONAL_VERTICAL_SLICE_PROTOCOL.md`
- Protocol commit: `0eaf7bbd0fff9e2d33d5c377004819132f0bb3ab`
- Implementation merge: `9a7cdaa368f5d2425488aad1f284ae1cf9109620`
- Real-agent Phase 2 evidence commit: `ca6d3a230ec488e1ff36cbacdab9a59fba49c3d9`
- Final real-agent evidence commit: `49a4ead2a6148de38fc29ef4f56a2d2ccaee4ab1`
- Independent verification commit: `8626b2a5fcdbd704fd5cd696507684d8a4dc7847`
- Independent report: `VERTICAL_SLICE/v01/evidence/run-20260907-01/CHATGPT_INDEPENDENT_VERIFICATION.md`

Verified causal chain:

```text
B0 CURRENT
→ real Codex work
→ proposal #1
→ explicit HUMAN approval #1
→ validated decision.changed SemanticEvent
→ B0 STALE_BLOCKING
→ stale B0-bound proposal rejected with zero journal append
→ rehydrate B1 CURRENT
→ concrete work adapted and verifier passes
→ fresh B1-bound proposal #2
→ explicit HUMAN approval #2
→ validated decision.changed SemanticEvent
→ B1 STALE_BLOCKING
→ rehydrate B2 CURRENT
→ concrete work continues against decision version 3
```

Final evidence confirms:

- project position `0 → 1 → 2`;
- `decision:auth` stream version `1 → 2 → 3`;
- two proposals / two human approvals / two validation receipts / two committed transactions / two semantic events;
- stale-context proposal enforcement prevents append;
- B2 verifies `CURRENT`, severity `NONE`, `changes=[]`;
- concrete artifact ends at `governingDecisionVersion: 3`;
- regression suites PASS: adapter **15/15**, governance **9/9**, V-01 **5/5**.

Coverage effect: **21/25 → 22/25; 84/100 → 88/100**.

---

## V-02 — Functional Vertical Slice criterion #2

**Status: PLANNED — DEFINITION MUST COME FROM ROADMAP AUTHORITY**

GitHub currently contains no accepted V-02 definition or acceptance criteria. Do not infer or invent V-02 from V-01.

Required next step: read the authoritative Google Drive roadmap/progress ledger and materialize the accepted V-02 scope before implementation begins.

Google Drive availability was blocked during the latest `::next`, so V-02 definition reconciliation remains pending.

---

## Compatibility note

Native MCP `2026-07-28` dual-era serving remains tracked as `GAP-MCP-2026`; it is not retroactively required for V-01 verification unless the roadmap authority promotes it into a criterion.
