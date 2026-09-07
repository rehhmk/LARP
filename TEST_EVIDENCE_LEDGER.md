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
- V-02: **ACTIVE — IMPLEMENTATION PASS / REAL AGENT EXECUTION PENDING**

Roadmap/spec authority remains Google Drive. GitHub is authoritative for executable evidence. Because the accepted V-02 definition was created and explicitly human-approved in this chat, GitHub contains the accepted V-02 criterion pending Drive reconciliation.

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

Coverage effect: **21/25 → 22/25; 84/100 → 88/100**.

---

## V-02 — Language → Runtime Vertical Slice

**Status: ACTIVE — IMPLEMENTATION PASS / REAL AGENT EXECUTION PENDING**

Accepted definition:

> Prove the complete LARP language-to-runtime path end to end: a real `*.larp` program compiles to LARP IR, initializes governed semantic state, supplies a real coding agent through MCP, accepts only human-governed mutation, and can replay accepted history to the same final projection.

Acceptance anchors:

- Proposal: `VERTICAL_SLICE/V02_PROPOSAL.md`
- Proposal commit: `811297d92c2a4b2a0fba3ff2ce61fb14fa814d05`
- Human-accepted decision: `VERTICAL_SLICE/V02_DECISION.md`
- Decision commit: `26a6bebb7a0ddf10437ca50301c566b8dfdb7a7f`

Implementation anchors:

- Initial PR: `#3 build(v02): language-to-runtime vertical slice`
- Corrective invariant PR: `#4 fix(v02): enforce build-phase language runtime invariants`
- reconciled implementation head: `0d6240a1681f88285309a8aafcbd407825a912ff`
- implementation merge commit: `9fb923226aab07415b2353a696308e0af02e7f5f`
- build report: `VERTICAL_SLICE/v02/V02_LOCAL_BUILD_REPORT.md`
- real source: `VERTICAL_SLICE/v02/source/project.larp`
- real-run protocol: `VERTICAL_SLICE/v02/CODEX_REAL_RUN.md`
- final PR-head V-02 CI run: `34159055344`
- final CI job: `101856855955`

Implemented and locally/CI-proven:

```text
*.larp source
→ deterministic compiler / source + semantic + IR fingerprints
→ explicit governed seed bootstrap
→ validation + transaction + semantic seed events
→ derived semantic projection
→ identical seed byte-stable no-op
→ changed materialized seed SEED_DIVERGENCE
→ source compilation alone leaves history/projection unchanged
→ CURRENT ContextBundle with governing Decision/dependency
→ existing MCP adapter server consumes generated projection
→ replay from accepted history = live logical projection
→ stop before real-agent proposal / HUMAN gate
```

CI result:

- Context compiler: **12/12 PASS**
- MCP adapter: **15/15 PASS**
- governance: **9/9 PASS**
- V-01: **5/5 PASS**
- V-02: **11/11 PASS**
- total deterministic tests: **56/56 PASS**
- generated ContextBundle freshness: **CURRENT**
- replay comparison: **MATCH**
- source fingerprint: `75658600482aa3dc7a3651ad04e98967ec90075275a275d3570ed20477fb0948`
- IR fingerprint: `a7fbbbac729869ff16776a684721b354df54066c69ea19b91767411a313dc32b`

V-02 is **not VERIFIED** yet. The remaining accepted proof is a real Codex Desktop execution against `LARP_V02` with an explicit human gate, followed by source/history separation and replay-from-zero evidence committed to GitHub.

Coverage therefore remains **22/25 = 88/100**.

Next execution unit: **real Codex Desktop V-02 execution through the first `V02 HUMAN GATE`.**

---

## Compatibility note

Native MCP `2026-07-28` dual-era serving remains tracked as `GAP-MCP-2026`; it is not part of V-02 unless separately promoted.
