# V-02 Proposal — Language → Runtime Vertical Slice

Status: **PROPOSED — HUMAN APPROVAL REQUIRED**

Roadmap slot: `V-02`
Current verified coverage before approval: `22 / 25 = 88 / 100`
Milestone: `M6 · Functional Vertical Slice`

## Classification

- **HYPOTHESIS:** this is the best next V-02 definition given the verified architecture and end goal.
- **NOT A DECISION:** this proposal does not become the accepted roadmap criterion until explicitly approved by a human.
- **NOT VERIFIED:** no coverage changes by creating this proposal.

## Proposed criterion

> **V-02 — Prove the complete LARP language-to-runtime path end to end: a real `*.larp` program compiles to LARP IR, initializes governed semantic state, supplies a real coding agent through MCP, accepts only human-governed mutation, and can replay accepted history to the same final projection.**

## Why this is the next missing vertical connection

Already verified:

- executable `*.larp` parser/compiler + diagnostics;
- LARP IR contract;
- deterministic state machine / event model;
- context compiler and freshness verification;
- MCP adapter with real Codex execution;
- human-gated proposals → validated SemanticEvents;
- V-01 full runtime causal loop including semantic drift, stale-context blocking, rehydration, and continuation.

Still not proven as one causal chain:

```text
*.larp source
→ compiler
→ LARP IR
→ bootstrap / seed materialization
→ semantic state
→ ContextBundle
→ MCP
→ real coding agent
→ proposal
→ HUMAN approval
→ K-01 validation
→ K-02 SemanticEvent
→ replay
→ same final projection
```

V-02 closes that gap.

## Proposed acceptance criteria

V-02 may be marked VERIFIED only if committed evidence proves all of the following.

### A. Source → IR

1. A real, versioned `*.larp` file is the only declarative project source for the slice.
2. A clean compiler run produces valid LARP IR.
3. Recompiling the same canonical source produces the same semantic fingerprint.
4. Invalid source produces diagnostics and no loadable IR.

### B. IR → governed bootstrap

5. Seed declarations are materialized through an explicit bootstrap operation, not merely by loading the file.
6. Bootstrap passes through the deterministic governance/state-machine boundary.
7. Initial accepted semantic state can be reconstructed from accepted seed events/history.
8. Re-running an already-materialized identical seed is a no-op/already-materialized result.
9. Changing a previously materialized seed fingerprint yields `SEED_DIVERGENCE` (or the canonical equivalent) rather than silently rewriting accepted state.

### C. Runtime → real agent

10. A ContextBundle is compiled from the state created by the `*.larp` bootstrap.
11. A real Codex Desktop coding agent receives that context through the LARP MCP adapter.
12. The agent performs concrete repository work tied to a task declared by the LARP program.
13. The agent's proposal is bound to a current ContextBundle.
14. Proposal creation is non-mutating and requires governance.

### D. Human-governed mutation

15. The coding agent cannot synthesize or self-authorize the human gate.
16. A pre-existing explicit HUMAN approval is consumed by the governed apply path.
17. K-01 deterministic validation returns ACCEPTED for the approved command.
18. K-02 commits exactly the expected SemanticEvent(s) with proposal causation and human-approval correlation.
19. The resulting projection reflects the approved semantic change.

### E. Program/history authority separation

20. Editing/recompiling `*.larp` after semantic history exists does **not** silently rewrite accepted history or the current projection.
21. Static program definitions and mutable semantic history remain distinguishable in the evidence.
22. Seed changes after materialization follow divergence/governance rules instead of desired-state reconciliation.

### F. Replay / reproducibility

23. A fresh runtime can replay the accepted semantic history to the same logical final projection.
24. Replay produces the same relevant stream versions / project position / semantic state as the verified run.
25. A clean clone (or equivalent isolated workspace) can reproduce source compile, bootstrap, context generation, deterministic tests, and replay using committed artifacts/instructions.

## Required real-agent evidence

At minimum preserve in GitHub `main` (or immutable referenced commit):

- source `*.larp` program;
- compiler command/output and semantic fingerprint;
- emitted LARP IR;
- bootstrap commands/results;
- seed event / transaction / validation receipts;
- initial reconstructed projection;
- ContextBundle + verification receipt;
- Codex session identity and MCP call evidence;
- concrete code diff/test evidence;
- proposal receipt;
- immutable HUMAN approval receipt;
- governed apply result;
- semantic event journal / transaction / validation evidence;
- post-change projection;
- proof that source editing alone does not mutate accepted semantic history;
- replay-from-zero output;
- projection comparison result;
- regression test output;
- independent verification report.

## Suggested scenario

Use a small authentication module similar to V-01, but **do not start from a hand-authored semantic JSON project fixture**.

Example program shape:

```larp
larp "0.1"

module "v02.auth" {
  version = "0.1.0"
  project = "v02-demo"

  scope "root" {}
  scope "backend" {
    parent = scope.root
  }

  seed node "auth" {
    kind      = larp.builtin.Decision
    scope     = scope.backend
    statement = "Use OAuth2 authorization-code flow with PKCE S256"
  }

  seed node "implement-auth" {
    kind  = larp.builtin.Task
    scope = scope.backend
    goal  = "Implement the authentication policy"
  }

  seed relation "task-auth" {
    kind   = larp.builtin.requires
    source = node.implement-auth
    target = node.auth
    scope  = scope.backend
  }
}
```

The exact domain content is not important. The causal path is.

## Explicit non-goals

V-02 does **not** need to prove:

- production-scale distributed storage;
- multi-user concurrency beyond existing OCC guarantees;
- every LARP language feature;
- network package/import resolution;
- UI/IDE experience;
- performance/SLA targets;
- native MCP `2026-07-28` migration unless separately promoted into scope;
- cross-model portability (reserved for later validation criteria unless roadmap says otherwise).

## Failure conditions

V-02 fails verification if any of the following occurs:

- semantic project fixture is manually authored as a shortcut instead of derived from `*.larp` + governed bootstrap;
- loading/recompiling source mutates semantic history implicitly;
- a coding agent creates or edits its own HUMAN approval receipt;
- proposal bypasses context binding/governance;
- accepted mutation has no deterministic validation/transaction/event provenance;
- replay does not reconstruct the same logical final projection;
- evidence exists only in chat/local workspace and is not committed.

## Rationale from current external engineering evidence

MCP's 2026-07-28 direction makes protocol transport stateless while allowing applications to maintain explicit state through ordinary identifiers/arguments. That supports keeping LARP's semantic state outside hidden MCP session state.

OpenAI's published Codex harness-engineering experience likewise emphasizes repository-local, versioned, mechanically verifiable knowledge and invariants rather than relying on agent memory or opaque external context. V-02 tests LARP's strongest version of that idea: the repository contains a declarative program whose governed runtime state is independently reconstructable and verifiable.

## Coverage effect if later VERIFIED

If this proposal is approved as V-02 and then independently verified:

- verified criteria: `22 / 25 → 23 / 25`
- verified coverage: `88 / 100 → 92 / 100`
- M6 Functional Vertical Slice: **CLOSED**
- next milestone: `M7 · Validation`

## Human gate

This document is only a proposal.

To promote it to the accepted V-02 roadmap criterion, require an explicit human approval such as:

```text
::approve V-02
```

Approval must mean: accept this criterion and acceptance contract, not mark it VERIFIED.
