# X-01 Phase 0 — Independent Build Verification

Status: VERIFIED BUILD READINESS / X-01 ACTIVE / NOT VERIFIED
Milestone: M7 Validation

## Evidence inspected

- Accepted criterion: `VALIDATION/X01_DECISION.md`
- Adversarial protocol: `VALIDATION/X01_ADVERSARIAL_REAL_AGENT_PROTOCOL.md`
- Readiness checkpoint: `92cd4aad3e4a6f8b95956de2e0ffc5277947fd39`
- Implementation head: `51398bc294d04d4c1675d9c8620969415b966fa4`
- Implementation PR: `#6`
- Implementation merge on main: `7902d5905a10df029afe3cfc2a85679833a099bb`
- Documentation follow-up head: `3e47ba1d85e10c0424720407a693428e82d14658`
- Documentation PR: `#7`

The user-reported `headCommit` for `::verify-build` is the documentation-only follow-up. The executable implementation is the earlier immutable implementation head and its merge on `main`.

## Approval provenance

PASS.

The governed apply path no longer accepts `actor.kind = HUMAN` as sufficient authority. It requires an Ed25519-signed ApprovalReceipt, checks actor/key identity, verifies the public key from an externally supplied trust store, and binds that trust store to the single active canonical `Authority` trust-anchor fingerprint.

Verified rejection properties include:

- fabricated HUMAN-shaped JSON → `APPROVAL_PROVENANCE_UNTRUSTED`;
- invalid/untrusted signature → deterministic rejection;
- substituted attacker trust store → `APPROVAL_TRUST_ANCHOR_MISMATCH`;
- rejection occurs before semantic acceptance/journal mutation.

No repository private key was found; tests generate ephemeral in-memory signing keys.

## Scope enforcement

PASS.

Proposal-time and apply-time boundaries both derive authority from canonical current state. The binding contains task, task allowed scope, agent scope, compile scope, target and target scope. Apply re-resolves the current authoritative values and rejects drift with `AUTHORITY_CONTEXT_CHANGED`.

Sibling scope fixture:

```text
root
├── backend
└── frontend
```

Backend-bound work cannot target the sibling frontend Decision. Proposal-time and injected apply-time cross-scope attempts reject with `AUTHORITY_DENIED` and zero forbidden semantic mutation. Backend-to-backend liveness remains valid.

## CI and deterministic tests

Dedicated workflow run `34170777947`, job `101890509094`: SUCCESS.

Observed test counts from CI logs:

- Context compiler: 12/12 PASS
- MCP adapter: 15/15 PASS
- Governance + Phase 0: 14/14 PASS
- V-01: 5/5 PASS
- V-02: 11/11 PASS
- X-01 Phase 0 harness: 6/6 PASS
- Aggregate: 63/63 PASS

Associated implementation-head workflows also succeeded:

- V02 Build Verification: `34170777917` SUCCESS
- X01 Phase 0 Enforcement: `34170777947` SUCCESS
- V01 Build Verification: `34170777973` SUCCESS

## Preserved invariants

- `STALE_BLOCKING → CONTEXT_STALE_BLOCKING` remains enforced.
- Source compilation alone does not mutate accepted semantic history.
- Changed already-materialized seed remains `SEED_DIVERGENCE`.
- No desired-state reconciliation was introduced.
- V-01 and V-02 regressions pass.

## Remaining gap

`GAP-X01-PHYSICAL-BOUNDARY` remains OPEN.

This build verifies deterministic protection through LARP authoritative interfaces. It does not prove OS/filesystem tamper resistance against a worker sharing the same unrestricted local user/filesystem.

## Verification result

X-01 Phase 0 build readiness is independently VERIFIED.

This does **not** verify X-01 itself and does not change coverage.

Current coverage remains:

- verified criteria: `23/25`
- verified coverage: `92/100`

Next required step: execute the accepted real-agent adversarial protocol (Attacks A–E), followed by valid external HUMAN-gated liveness, replay, committed evidence, and independent final verification.
