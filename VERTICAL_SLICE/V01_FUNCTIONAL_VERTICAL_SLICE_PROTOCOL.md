# V-01 — Functional Vertical Slice Protocol

Status: ACTIVE — PROTOCOL DEFINED / IMPLEMENTATION GAP IDENTIFIED
Roadmap milestone: M6 · Functional Vertical Slice
Criterion: V-01
Verified coverage on entry: 21/25 = 84/100
Executable evidence authority: GitHub `rehhmk/LARP@main`

## Objective

Prove, with a real coding agent and committed evidence, that LARP can govern one complete project-state cycle across context compilation, real work, semantic drift, stale-context detection, rehydration, proposal, human approval, deterministic validation, SemanticEvent persistence, and continuation from fresh context.

V-01 is not a collection of isolated unit tests. It is one causal execution chain whose receipts cross-reference each other.

## Research basis

Focused web research performed 2026-09-07 informed this protocol:

1. MCP 2026-07-28 moved the protocol core to a stateless request/response model and explicitly recommends that application state be carried through explicit application-level handles rather than hidden transport sessions. This reinforces LARP's design: ContextBundle identity/freshness belongs to LARP semantic/runtime state, not the MCP connection.
   - https://blog.modelcontextprotocol.io/posts/2026-07-28/
   - https://ts.sdk.modelcontextprotocol.io/v2/protocol-versions

2. LangGraph's production human-in-the-loop pattern persists state at an interrupt, waits for human input, and resumes from a checkpoint. This validates the general pause → approve/reject → resume shape, while LARP keeps the approval authority and semantic state in its own deterministic governance layer.
   - https://docs.langchain.com/oss/python/langgraph/interrupts
   - https://docs.langchain.com/oss/python/langgraph/persistence

3. OpenAI's Codex harness engineering notes emphasize repository-local structured knowledge, executable feedback loops, and making state/constraints mechanically legible to agents rather than relying on conversational memory. GitHub therefore remains the executable evidence surface for V-01.
   - https://openai.com/index/harness-engineering/
   - https://openai.com/index/unlocking-the-codex-harness/

## Non-goals

- V-01 does not redefine the LARP language grammar.
- V-01 does not change K-01/K-02 authority semantics.
- V-01 does not make Git the semantic event store.
- V-01 does not require migration to MCP 2026-07-28 before the semantic slice can be verified.
- V-01 does not define V-02.

## Existing capability entering V-01

Already verified:

- deterministic ContextBundle compilation;
- `CURRENT | STALE_NON_BLOCKING | STALE_BLOCKING` verification;
- real Codex Desktop MCP host;
- `larp_status`;
- `larp_get_context`;
- `larp_verify_context`;
- `larp_propose` as non-mutating proposal journal;
- human-only approval boundary;
- deterministic approved proposal validation;
- committed semantic transaction and `SemanticEvent`.

## Critical implementation gap discovered

Current `larp_propose` records the project position/hash observed *at proposal time*, but it does not require the agent to bind the proposal to the ContextBundle from which the agent reasoned.

Therefore this unsafe sequence is currently possible:

```text
Agent receives Bundle B0
        ↓
semantic state changes
        ↓
Agent never verifies B0
        ↓
larp_propose reads NEW project state
        ↓
proposal receipt looks current even though reasoning used stale context
```

V-01 must close this gap.

### Required V-01 proposal binding

`larp_propose` must accept a context reference sufficient to verify the reasoning context before journaling the proposal.

Minimum contract:

```text
contextBundleFingerprint: string
contextBundle?: ContextBundle
```

Before appending `proposals.jsonl`:

```text
verify_context(bundle, current_projection)
    ↓
CURRENT              → proposal may be recorded
STALE_NON_BLOCKING   → proposal may be recorded, receipt must record warning
STALE_BLOCKING       → reject CONTEXT_STALE_BLOCKING; append no proposal
```

The proposal receipt must include:

- `contextBundleFingerprint`;
- context source project position;
- context freshness result at proposal time;
- relevant drift/warnings when non-blocking;
- current project position/hash already captured by A-01.

This check is deterministic. The coding agent cannot override it.

## Test fixture

Use an isolated V-01 fixture. Do not reuse/mutate the A-01/A-02 `demo` evidence fixture.

Suggested project id: `v01-demo`.

The fixture must contain at minimum:

```text
scope:backend
agent:coding

task:implement-auth
  requires → decision:auth

decision:auth
unknown:refresh-policy
```

The task must correspond to a concrete editable artifact plus executable tests. A prose-only agent response does not satisfy V-01.

## Causal test sequence

### Phase 0 — deterministic initialization

1. Create/reset the isolated fixture from a deterministic seed.
2. Record starting project position, stream versions, fixture hash, runtime journal counts, and Git commit SHA.
3. Assert no leftover V-01 runtime receipts from previous executions.

### Phase 1 — real agent hydration

A real coding-agent host must:

1. call `larp_status`;
2. call `larp_get_context` for the V-01 task/agent/scope;
3. receive ContextBundle `B0`;
4. call `larp_verify_context(B0)`;
5. receive `CURRENT`.

Persist the exact B0 receipt/fingerprint in test evidence.

### Phase 2 — real work begins

Using B0, the coding agent begins the concrete implementation task and produces an initial work artifact/diff.

This work is deliberately not finalized yet.

### Phase 3 — governed semantic drift

While B0 exists, the control side changes a governing dependency of the task, specifically `decision:auth`.

The drift itself must pass through normal LARP governance:

```text
proposal
→ explicit HUMAN approval
→ deterministic validation
→ SemanticTransaction
→ SemanticEvent
→ projection advances
```

The drift event and approval must be committed as evidence.

### Phase 4 — stale context must be detected and enforced

The coding agent must then:

1. call `larp_verify_context(B0)`;
2. receive `STALE_BLOCKING`;
3. receive a DriftReport identifying the changed governing dependency;
4. attempt a `larp_propose` bound to B0;
5. receive `CONTEXT_STALE_BLOCKING`;
6. prove that `proposals.jsonl` did not gain a proposal from the rejected stale attempt.

This is the core V-01 safety proof.

### Phase 5 — rehydrate

The agent must:

1. call `larp_get_context` again;
2. receive new ContextBundle `B1`;
3. prove `B1.bundleFingerprint != B0.bundleFingerprint`;
4. prove the changed decision is explicitly represented in B1;
5. call `larp_verify_context(B1)` and receive `CURRENT`.

### Phase 6 — adapt concrete work

The real agent must revise the implementation so the concrete work reflects B1 rather than B0.

Executable task tests must pass after the adaptation.

Evidence must make the before/after adaptation observable; simply claiming the agent reconsidered the task is insufficient.

### Phase 7 — fresh governed proposal

The agent submits a proposal bound to B1.

Required result before human approval:

- proposal status `PROPOSED`;
- context freshness at proposal time `CURRENT`;
- semantic mutation applied `false`;
- governance required `true`;
- proposal persisted exactly once.

### Phase 8 — human gate and semantic apply

Stop for an explicit human approval of that exact proposal id.

After approval:

```text
approved proposal
→ K-01 deterministic validation
→ K-02 SemanticTransaction
→ SemanticEvent(s)
→ updated projection
```

The coding agent must not create the human approval receipt.

### Phase 9 — continuation from fresh state

After the event:

1. obtain ContextBundle `B2`;
2. verify B2 is `CURRENT`;
3. prove B2 reflects the newly accepted semantic state;
4. run the concrete task tests again;
5. commit the full V-01 evidence to GitHub.

## PASS criteria

V-01 is VERIFIED only if all are true:

1. isolated deterministic fixture used;
2. a real coding agent performs the agent-side calls/work;
3. B0 is initially CURRENT;
4. a governing dependency changes through a human-gated SemanticEvent;
5. B0 becomes STALE_BLOCKING for the correct dependency reason;
6. proposal bound to B0 is deterministically rejected with no proposal-journal append;
7. B1 is newly compiled, differs from B0, contains the changed governing state, and is CURRENT;
8. concrete agent work visibly adapts to B1 and executable tests pass;
9. fresh proposal bound to B1 is recorded but does not mutate semantic state;
10. explicit HUMAN approval authorizes that exact proposal;
11. deterministic validation commits the resulting semantic transaction/event;
12. B2 is CURRENT and reflects the accepted final state;
13. all ids, fingerprints, versions, positions, causation/correlation refs and journal counts cross-reference consistently;
14. required evidence is committed to GitHub `main` (or an explicitly referenced immutable commit SHA) and independently inspectable.

No partial credit. Any failed required invariant keeps V-01 ACTIVE.

## Required committed evidence

At minimum:

- `V01_EXTERNAL_AGENT_EVIDENCE.md`;
- isolated initial/final fixture or replayable seed;
- B0 context receipt/bundle or canonical serialized evidence;
- B0 stale DriftReport;
- stale proposal rejection receipt plus before/after proposal journal counts;
- B1 context receipt/bundle;
- concrete work diff/artifact;
- executable task test output;
- drift proposal + human approval + validation + transaction + event;
- final proposal + human approval + validation + transaction + event;
- B2 context receipt/bundle;
- final project position/stream versions;
- Git commit SHA(s);
- artifact hashes where useful.

## MCP 2026 compatibility note

Current LARP adapter evidence uses the 2025-era stdio handshake and intentionally returns method-not-found on `server/discover` so modern clients can fall back. The MCP TypeScript SDK v2 explicitly supports modern-to-legacy auto negotiation, and legacy revisions remain supported during the deprecation window.

Therefore MCP wire migration is recorded as a compatibility gap, not a V-01 blocker:

`GAP-MCP-2026: add native 2026-07-28 stdio support / dual-era serving.`

V-01 must keep application context state explicit and independent of MCP transport-session state so that later migration does not change LARP semantics.

## Current gate after this protocol

```text
V-01
  protocol             ✓ defined
  context-bound propose □ implement
  isolated fixture      □ build
  local executable run  □ pass
  real agent run        □ pass
  human gates           □ pending during run
  committed evidence    □ verify
```

Next coherent unit: implement the context-bound proposal safety gate and V-01 isolated harness, then run local deterministic tests before asking the human to execute the real-agent slice.
