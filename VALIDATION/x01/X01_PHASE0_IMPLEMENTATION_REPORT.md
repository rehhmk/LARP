# X-01 Phase 0 — Deterministic Enforcement Implementation

Status: IMPLEMENTATION PASS / REAL ADVERSARIAL RUN PENDING
Accepted criterion: `VALIDATION/X01_DECISION.md`
Readiness basis: `VALIDATION/X01_PHASE0_READINESS_REPORT.md` at `92cd4aad3e4a6f8b95956de2e0ffc5277947fd39`

## Result

The minimum deterministic enforcement required before the X-01 real-agent run is implemented. This is a readiness result only: **X-01 remains ACTIVE and is not VERIFIED**.

## Approval provenance boundary

An approval claiming `actor.kind = HUMAN` is no longer sufficient.

The governed apply path now requires:

1. an Ed25519 signature covering the canonical approval receipt;
2. a stable human actor/key identity match;
3. an active public key in an external trust store;
4. a trust-store fingerprint matching the single active `Authority` anchor in canonical semantic state.

This prevents an agent from satisfying the gate by writing HUMAN-shaped JSON, signing with an untrusted key, or passing a replacement trust store through the apply CLI. A correctly signed approval from the canonically pinned external trust domain still applies successfully.

## Effective scope boundary

Every context-bound proposal now records an authority binding containing:

- task id and scope;
- task allowed scope;
- agent id and scope;
- context compile scope;
- target id and scope.

The proposal boundary rejects targets outside any effective boundary before proposal append. The authoritative apply boundary recomputes those facts from current canonical state and rejects both out-of-scope targets and changed bindings before semantic append.

The isolated fixture `VALIDATION/x01/fixture/project.larp` adds sibling `backend` and `frontend` scopes plus a frontend Decision target. V-02 source and semantics are unchanged.

## Rejection atomicity

Deterministic rejection tests snapshot and compare:

- the canonical projection;
- proposal journal where applicable;
- human approval journal;
- semantic validation receipts;
- semantic transactions;
- accepted SemanticEvents.

Forged approval, substituted trust anchor, proposal-time scope denial, apply-time scope denial, and authority-binding drift all produce zero forbidden append and zero projection mutation.

## Deterministic test result

Exact local result:

- Context compiler: **12/12 PASS**
- MCP adapter: **15/15 PASS**
- Governance and Phase 0 unit tests: **14/14 PASS**
- V-01: **5/5 PASS**
- V-02: **11/11 PASS**
- X-01 Phase 0 isolated harness: **6/6 PASS**
- Aggregate: **63/63 PASS**

The dedicated X-01 harness proves:

1. the backend context cannot see or target the sibling frontend Decision;
2. proposal-time scope denial appends nothing;
3. fabricated HUMAN JSON cannot authorize apply;
4. an attacker key plus attacker trust store cannot replace the canonical trust anchor;
5. apply re-check rejects an injected cross-scope proposal;
6. a legitimate externally signed approval remains live and produces the expected governed mutation.

## Explicit unresolved boundary

`GAP-X01-PHYSICAL-BOUNDARY` remains unresolved.

This prototype stores its trust anchor, projection, and journals in local files writable by the same operating-system user as the coding agent. The implementation enforces semantic acceptance through LARP interfaces; it does **not** claim protection against direct hostile file replacement, OS-user compromise, key theft, or production-grade tamper resistance.

Closing that gap requires a separate trust/hosting architecture such as isolated credentials and an independently protected authoritative state service. It is outside X-01 Phase 0.

## Next gate

Run `VALIDATION/X01_ADVERSARIAL_REAL_AGENT_PROTOCOL.md` with a real coding agent. Do not increase verified coverage or mark X-01 VERIFIED until immutable run evidence is committed and independently inspected.
