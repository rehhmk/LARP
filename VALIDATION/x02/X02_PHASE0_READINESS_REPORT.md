# X-02 Phase 0 — Deterministic Readiness Report

Status: PASS / REAL TWO-WORKER RUN STILL REQUIRED
Milestone: M7 Validation
Governing decision: `VALIDATION/X02_DECISION.md`
Protocol: `VALIDATION/X02_CROSS_WORKER_CONTINUITY_PROTOCOL.md`

## Scope

This report records deterministic readiness only. It does **not** verify X-02.

The real accepted criterion still requires a real Worker A, an externally HUMAN-approved semantic transition, a recorded Worker-A loss boundary, and a fresh isolated Worker B that cold-starts from persisted LARP state without receiving Worker A's transcript or the semantic answer.

## Implementation

Branch: `build/x02-phase0-readiness`
Implementation head tested by CI: `d9bc313595820a735dde523e6b349f55a57c764b`
Pull request: `#8`
CI workflow: `X02 Phase 0 Continuity Readiness`
CI run: `34721991617`
CI job: `103629473177`

Added:

- `VALIDATION/x02/fixture/project.larp`
- `VALIDATION/x02/work/verify-auth-policy.js`
- `VALIDATION/x02/test/phase0.test.js`
- `VALIDATION/x02/package.json`
- `.github/workflows/x02-phase0.yml`

## Dedicated continuity fixture

The fixture seeds the old/pre-handoff policy:

> Use OAuth2 authorization-code flow with PKCE S256 and Bearer access-token authorization.

The governed test transition changes accepted semantic state to:

> Use OAuth2 authorization-code flow with PKCE S256 and DPoP-bound access-token authorization.

The `.larp` source remains on the old Bearer statement after the governed transition. The current post-handoff answer therefore exists in accepted semantic history/projection rather than by editing the seed source.

## Deterministic verifier

`VALIDATION/x02/work/verify-auth-policy.js` reads the live canonical project projection and derives expected artifact behavior from the current `decision:auth`.

It distinguishes the two policies materially:

- Bearer state requires `Authorization: Bearer <token>` and no DPoP proof header;
- DPoP state requires `Authorization: DPoP <token>` plus a DPoP proof and rejects missing proof input;
- authorization-code flow and PKCE S256 remain invariant.

The verifier therefore detects stale implementation rather than merely checking a hardcoded post-handoff answer supplied to a worker.

## X-02 Phase 0 checks

All five dedicated readiness checks passed:

1. `X02-P0-L01` — dedicated fixture compiles deterministically and bootstraps pre-handoff state;
2. `X02-P0-L02` — initial task ContextBundle is `CURRENT` and carries governing Decision/authority/dependencies;
3. `X02-P0-L03` — externally signed governed Decision transition changes semantic state without editing source and makes Worker-A context `STALE_BLOCKING`;
4. `X02-P0-L04` — stale Bearer artifact passes before transition, fails after transition, while current DPoP artifact passes using live projection;
5. `X02-P0-L05` — replay after the governed transition matches the live logical projection.

## Regression result

CI job `103629473177` passed every step.

Observed suites:

- Context compiler: **12 / 12 PASS**
- MCP adapter: **15 / 15 PASS**
- Governance + X-01 unit tests: **14 / 14 PASS**
- V-01: **5 / 5 PASS**
- V-02: **11 / 11 PASS**
- X-01 deterministic harness: **6 / 6 PASS**
- X-02 Phase 0 readiness harness: **5 / 5 PASS**

Aggregate: **68 / 68 PASS**.

## Readiness conclusion

Phase 0 proves the dedicated fixture can support the accepted continuity experiment:

```text
seed source = old Bearer policy
        ↓
A0 CURRENT
        ↓
proposal = zero semantic mutation
        ↓
external HUMAN approval
        ↓
accepted DPoP semantic state
        ↓
A0 STALE_BLOCKING
        ↓
old artifact FAILS current verifier
current artifact PASSES
        ↓
replay MATCH
```

The next gate is the **real Worker A execution**. X-02 remains **ACTIVE / NOT VERIFIED** and coverage remains **24/25 = 96/100** until the two-worker evidence is committed and independently inspected.

## Claim boundaries

- `GAP-X01-PHYSICAL-BOUNDARY` remains OPEN.
- Phase 0 does not prove session continuity by itself.
- Two fresh sessions on the same real host can prove session continuity.
- Cross-host/cross-model portability may be claimed only if Worker A and Worker B actually use distinct real hosts/models.
