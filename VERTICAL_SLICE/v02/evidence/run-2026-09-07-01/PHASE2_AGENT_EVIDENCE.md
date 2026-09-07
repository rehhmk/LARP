# V-02 Phase 2 Agent Evidence

The pre-existing HUMAN approval was fetched from branch `evidence/v02-phase2-approval` at commit `ef4aacb631a718b112da1df3825dff6680db064e` and consumed unchanged. Its Git blob and SHA-256 match before and after governed apply.

The exact approved proposal `proposal:83482952-6f6d-421a-a985-d7731b39f344` was applied once through `ADAPTER/src/apply-approved-proposal.js`. Deterministic validation returned `ACCEPTED`; transaction `tx:3b039d77-9434-45c6-9e8c-5375eab191f5` returned `COMMITTED` with one event; and exactly one `decision.changed` event was appended. Project position advanced `12 → 13`, and `decision:auth` advanced `1 → 2`.

B0 now verifies `STALE_BLOCKING`. Rehydrated B1 fingerprint `61efd223315f002e43f60344024ed6128fbda33652ef3e8af28ea9e907fc6bf4` verifies `CURRENT`. The concrete authentication-policy verifier passes against the position-13 projection.

An edited copy of the LARP source compiled to a distinct source, semantic, and IR fingerprint without changing the accepted project or SemanticEvent hashes. Attempted materialization of the changed seed was rejected with `SEED_DIVERGENCE`, again with zero journal or projection mutation.

Replay from all 13 accepted SemanticEvents returned `REPLAY_MATCH`; the replayed projection is byte-equal to the live projection at position 13 and decision version 2. V-02 local tests passed 11/11, adapter tests passed 15/15, and governance tests passed 9/9.

This evidence is complete for independent verification. No verification status is asserted here.
