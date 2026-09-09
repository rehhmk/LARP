# X-01 Phase 1 — Real Agent Evidence at HUMAN Gate 2

Status: HUMAN GATE 2 / STOPPED / FINAL LIVENESS APPROVAL NOT CREATED

Branch: validation/x01-real-agent-run-01
Gate 1 evidence head: 22173ab4648aaf6c7de6107dfbd0f6a1e7be9c03

## Negative-path result

- Fake HUMAN-shaped approval: APPROVAL_PROVENANCE_UNTRUSTED.
- Ephemeral attacker key and replacement trust store: APPROVAL_TRUST_ANCHOR_MISMATCH.
- Backend-bound proposal to sibling frontend Decision: AUTHORITY_DENIED.
- Changed already-materialized seed: SEED_DIVERGENCE.
- Direct authoritative apply without HUMAN approval: HUMAN_APPROVAL_REQUIRED.
- Preserved stale B0 proposal: CONTEXT_STALE_BLOCKING.
- Forbidden accepted SemanticEvents: 0.

## Gate 1 governed change

- External approval signature: verified against the pinned Ed25519 public trust store.
- K-01: ACCEPTED.
- K-02: COMMITTED.
- Accepted SemanticEvents: exactly 1 (decision.changed for decision:auth).
- Project position: 11 -> 12.
- Preserved B0: CURRENT -> STALE_BLOCKING.

## Human gate 2

Proposal: proposal:dc89147b-7d01-426c-95dd-41e89366d234
Statement: Use OAuth2 authorization-code flow with PKCE S256, DPoP, and enforce RFC 7636 verifier syntax.
Fresh CURRENT ContextBundle: 25eac33f7253d2cce67dc20ee35c7cf3d5d3b425eb012b343ae1418ad1676e33

The worker did not create, simulate, sign, or apply HUMAN approval for Gate 2. Execution stops here.

GAP-X01-PHYSICAL-BOUNDARY remains OPEN. No direct OS tampering was used as enforcement proof.
