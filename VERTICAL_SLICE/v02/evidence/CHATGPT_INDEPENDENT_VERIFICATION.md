# V-02 Independent Verification

Status: VERIFIED
Date: 2026-09-07

## Immutable evidence inspected

Final real-agent evidence commit:
`ea2061e165da53719d74fc26a56fae4b8faf46ea`

Phase 1 evidence commit:
`1fca09a6a89ecfdd6ad041d28b1034bf4502e545`

External HUMAN approval commit:
`ef4aacb631a718b112da1df3825dff6680db064e`

Approved proposal:
`proposal:83482952-6f6d-421a-a985-d7731b39f344`

## Independently verified facts

- Real Codex Desktop Phase 1 consumed state derived from the real `.larp` source and produced a context-bound proposal.
- Proposal was `PROPOSED`, context `CURRENT`, `semanticMutationApplied=false`, `governanceRequired=true`.
- The HUMAN approval pre-existed Phase 2 and was consumed unchanged; its Git blob and SHA-256 were identical before and after governed apply.
- Governed apply returned `APPLIED`.
- Deterministic validation returned `ACCEPTED`.
- Semantic transaction returned `COMMITTED` with exactly one event.
- Event type was `decision.changed` for `decision:auth`.
- Project position advanced `12 → 13`.
- Decision stream version advanced `1 → 2`.
- B0 verified `STALE_BLOCKING` after the governed mutation.
- Rehydrated B1 verified `CURRENT`, severity `NONE`, changes `[]`, at project position 13.
- Concrete authentication-policy verifier passed against the position-13 projection.
- A changed `.larp` source compiled independently without changing accepted semantic history.
- Attempted materialization of the changed seed returned `SEED_DIVERGENCE` with no semantic rewrite.
- Replay after apply returned `REPLAY_MATCH` at project position 13.
- Live and replayed projections were byte-equal.
- V-02 tests: 11/11 PASS; adapter: 15/15 PASS; governance: 9/9 PASS. Build-time regression evidence also anchors compiler 12/12 and V-01 5/5.

## Criterion result

V-02 — Language → Runtime Vertical Slice: **VERIFIED**.

Coverage transition:

- verified criteria: `22 / 25 → 23 / 25`
- verified coverage: `88 / 100 → 92 / 100`
- M6 Functional Vertical Slice: **CLOSED**
- next milestone: **M7 Validation**
- remaining criteria: **X-01, X-02**

This verification does not promote any additional criterion and does not infer acceptance of X-01 or X-02.
