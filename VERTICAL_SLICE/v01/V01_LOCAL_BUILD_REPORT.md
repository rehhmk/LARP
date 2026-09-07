# V-01 Local Build Report

Status: **IMPLEMENTATION PASS — REAL AGENT EXECUTION PENDING**

Roadmap criterion: V-01
Coverage on entry: 21/25 = 84/100
This report does **not** mark V-01 VERIFIED.

## Build scope

This build closes the implementation gap identified by `V01_FUNCTIONAL_VERTICAL_SLICE_PROTOCOL.md`:

- every `larp_propose` is now bound to a ContextBundle fingerprint;
- proposal-time context freshness is checked deterministically before journal append;
- `STALE_BLOCKING` yields `CONTEXT_STALE_BLOCKING` and zero proposal append;
- `STALE_NON_BLOCKING` may proceed but drift is persisted in the proposal receipt;
- explicit full ContextBundle binding works after MCP server restart;
- an isolated `v01-demo` fixture exists;
- the concrete work artifact is executable code whose verifier fails after governing semantic drift until the implementation adapts.

## CI evidence

Workflow: `V01 Build Verification`
Final pre-report code head: `8a11696be071bf4033deb106ece2883829b11b01`
Workflow run: `34141917913`
Job: `101805566048`
Runner: Ubuntu 24.04 / Node 24.20.0
Result: **SUCCESS**

### Test results

- A-01 adapter regression: **15/15 PASS**
- A-02 governance regression: **9/9 PASS**
- V-01 isolated harness: **5/5 PASS**
- Total: **29/29 PASS**

## V-01 local harness invariants proven

1. B0 is initially `CURRENT`.
2. A context-bound governed drift proposal can be applied through the existing human-approval governance path in the deterministic local harness.
3. After the governing `decision:auth` changes, B0 becomes `STALE_BLOCKING` and identifies `decision:auth` as drift.
4. `larp_propose` bound to stale B0 returns `CONTEXT_STALE_BLOCKING`.
5. The rejected stale proposal does not increase `proposals.jsonl` count.
6. The concrete auth-policy verifier passes before drift, fails after drift while code is unchanged, then passes after the implementation is adapted.
7. Rehydration yields B1 with a different fingerprint and the changed DPoP decision explicitly represented.
8. A fresh proposal bound to B1 is recorded as `PROPOSED`, `semanticMutationApplied=false`, `governanceRequired=true`, without adding a SemanticEvent.
9. `STALE_NON_BLOCKING` context may propose and the proposal receipt records the drift.
10. Explicit ContextBundle/fingerprint mismatch is rejected before append.
11. A full ContextBundle can bind a proposal after MCP server restart, avoiding hidden transport-session dependence.

## Remaining V-01 gate

The local harness is not a substitute for the required real-agent causal chain.

V-01 remains ACTIVE until Codex Desktop performs the complete sequence with committed evidence:

`B0 CURRENT -> real work -> human-gated drift -> B0 STALE_BLOCKING -> stale proposal rejected -> B1 CURRENT -> real code adaptation -> fresh proposal -> explicit HUMAN approval -> SemanticEvent -> B2 CURRENT`.

No coverage increase is granted by this build alone.
