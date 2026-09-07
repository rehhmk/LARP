# LARP — Test Evidence Ledger

Status: ACTIVE
Repository: `rehhmk/LARP`
Authoritative branch for executable test evidence: `main`
Policy: `TESTING_SOURCE_OF_TRUTH.md`

## Current executable status

- Verified criteria: **23 / 25**
- Verified coverage: **92 / 100**
- M5 Agent Integration: **CLOSED**
- M6 Functional Vertical Slice: **CLOSED**
- V-01: **VERIFIED**
- V-02: **VERIFIED**
- M7 Validation: **ACTIVE**
- Remaining criteria: **X-01, X-02**

Roadmap/spec authority remains Google Drive. GitHub is authoritative for executable evidence. V-02 was explicitly human-approved and independently verified from immutable GitHub evidence; Drive reconciliation remains separate coordination work.

---

## A-01 — Real coding-agent MCP adapter verification

**Status: VERIFIED**

Evidence anchors:
- Evidence commit: `c630a01363593eb78b1931abfa3ca527d25ee699`
- External agent evidence: `ADAPTER/A01_EXTERNAL_AGENT_EVIDENCE.md`

Coverage effect: **19/25 → 20/25; 76/100 → 80/100**.

---

## A-02 — Human-gated proposal → validated SemanticEvent

**Status: VERIFIED**

Evidence anchors:
- Human approval commit: `345d9cabbcb8cd2314725276096003bdbc85533b`
- Governed external-apply evidence commit: `82bbdc0f9181737f63c36cc5284d16267889fd1d`
- Independent verification ledger commit: `abf37e092424c99e9ca92b5c5ecfd2dcf7955966`

Coverage effect: **20/25 → 21/25; 80/100 → 84/100**. M5 Agent Integration CLOSED.

---

## V-01 — Functional vertical slice with semantic drift and rehydration

**Status: VERIFIED**

Evidence anchors:
- Protocol: `VERTICAL_SLICE/V01_FUNCTIONAL_VERTICAL_SLICE_PROTOCOL.md`
- Final real-agent evidence commit: `49a4ead2a6148de38fc29ef4f56a2d2ccaee4ab1`
- Independent verification commit: `8626b2a5fcdbd704fd5cd696507684d8a4dc7847`
- Independent report: `VERTICAL_SLICE/v01/evidence/run-20260907-01/CHATGPT_INDEPENDENT_VERIFICATION.md`

Coverage effect: **21/25 → 22/25; 84/100 → 88/100**.

---

## V-02 — Language → Runtime Vertical Slice

**Status: VERIFIED**

Accepted definition:

> Prove the complete LARP language-to-runtime path end to end: a real `*.larp` program compiles to LARP IR, initializes governed semantic state, supplies a real coding agent through MCP, accepts only human-governed mutation, and can replay accepted history to the same final projection.

Definition/implementation anchors:
- Proposal: `VERTICAL_SLICE/V02_PROPOSAL.md`
- Human-accepted decision: `VERTICAL_SLICE/V02_DECISION.md`
- Implementation merge: `1e4c4ae1964d121d8449b7ed333d4aa90a91d591`
- Real source: `VERTICAL_SLICE/v02/source/project.larp`
- Source fingerprint: `75658600482aa3dc7a3651ad04e98967ec90075275a275d3570ed20477fb0948`
- IR fingerprint: `a7fbbbac729869ff16776a684721b354df54066c69ea19b91767411a313dc32b`
- Phase 1 evidence commit: `1fca09a6a89ecfdd6ad041d28b1034bf4502e545`
- External HUMAN approval commit: `ef4aacb631a718b112da1df3825dff6680db064e`
- Final real-agent evidence commit: `ea2061e165da53719d74fc26a56fae4b8faf46ea`
- Independent verification: `VERTICAL_SLICE/v02/evidence/CHATGPT_INDEPENDENT_VERIFICATION.md`

Verified causal path:

```text
real project.larp
→ deterministic LARP IR
→ governed seed bootstrap
→ accepted seed SemanticEvents
→ projection at position 12
→ ContextBundle B0 CURRENT
→ real Codex repository work
→ context-bound proposal / zero semantic mutation
→ explicit external HUMAN approval
→ deterministic validation ACCEPTED
→ transaction COMMITTED / exactly one decision.changed event
→ project position 12 → 13
→ decision:auth version 1 → 2
→ B0 STALE_BLOCKING
→ rehydrate B1 CURRENT
→ concrete verifier PASS
→ changed source compiles without rewriting history
→ changed materialization rejected SEED_DIVERGENCE
→ replay from 13 accepted events
→ REPLAY_MATCH / byte-equal projection
```

Regression/evidence result:
- Context compiler build regression: **12/12 PASS**
- MCP adapter: **15/15 PASS**
- governance: **9/9 PASS**
- V-01 build regression: **5/5 PASS**
- V-02: **11/11 PASS**
- B1 freshness: **CURRENT**
- replay: **MATCH** at project position 13
- live/replayed projection: **byte-equal**
- source/history separation: **PASS**
- changed seed materialization: **SEED_DIVERGENCE**

Coverage effect: **22/25 → 23/25; 88/100 → 92/100**.

M6 Functional Vertical Slice is now **CLOSED**.

---

## M7 — Validation

**Status: ACTIVE**

Remaining criteria:
- X-01 — ACTIVE; Phase 0 deterministic enforcement implemented, real-agent adversarial run pending
- X-02

X-01 was separately proposed and explicitly human-approved. X-02 still requires an accepted definition before implementation.

X-01 Phase 0 readiness evidence is recorded in `VALIDATION/x01/X01_PHASE0_IMPLEMENTATION_REPORT.md`. This does not change verified criteria or coverage.

---

## Compatibility note

Native MCP `2026-07-28` dual-era serving remains tracked as `GAP-MCP-2026`; it is not retroactively required for V-02 verification unless separately promoted.
