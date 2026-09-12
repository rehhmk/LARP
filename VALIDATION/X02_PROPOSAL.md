# X-02 Proposal — Cross-Worker Cold-Start Continuity

Status: PROPOSED / HUMAN APPROVAL REQUIRED
Milestone: M7 Validation

## Why this should be the final criterion

LARP's central product claim is not only that one agent can be governed correctly, but that project state can survive the loss or replacement of the agent/session that was doing the work.

X-01 proved the negative safety property: a real coding agent can attempt forbidden effects without those effects entering accepted semantic state.

X-02 should prove the complementary continuity property: project understanding and governed execution do not depend on the originating chat/session/model memory.

## Proposed accepted criterion

> X-02 proves that a LARP project can survive worker/session loss and continue correctly on a fresh independent coding agent without transferring the previous conversation transcript: the new worker hydrates from persisted LARP state, reconstructs the active task/decisions/authority/dependencies, continues from a CURRENT ContextBundle, completes a concrete governed unit of work, and replay from accepted history still matches the final canonical projection.

## Governing continuity property

> The worker is disposable; governed project state is durable.

Loss of an agent session must not require the human to manually restate accepted project decisions or reconstruct hidden conversational memory.

## Required real-agent proof

The accepted run must include all of the following.

1. **Worker A is real and context-bound.**
   - Start a real coding-agent session from a real `*.larp` project/runtime.
   - Obtain a CURRENT ContextBundle for a concrete task.
   - Record task, authority, dependency and bundle fingerprints.

2. **A legitimate semantic change occurs before handoff.**
   - Worker A creates a context-bound proposal.
   - Proposal creation applies zero semantic mutation.
   - A HUMAN approval is supplied externally through the governed approval path.
   - K-01 accepts and K-02 commits exactly the authorized transition.
   - The old Worker-A ContextBundle becomes `STALE_BLOCKING` where the changed dependency is blocking.

3. **Worker A is then considered lost.**
   - No conversational transcript, free-form handoff summary, chain-of-thought, or hidden worker memory may be supplied to Worker B.
   - Worker A must perform no further project reasoning after the handoff point.

4. **Worker B is a fresh independent real coding-agent session.**
   - Prefer a different real agent host/model from Worker A when available.
   - At minimum, it must be a fresh isolated session with no access to Worker A's conversation state.
   - The recovery prompt may identify only the repository/project and task reference plus an instruction to hydrate/continue.
   - The recovery prompt must NOT restate the active Decision statement, previous proposal contents, expected answer, or Worker-A reasoning.

5. **Worker B cold-starts from LARP.**
   - Worker B must retrieve status/context from persisted LARP/Git/runtime state.
   - It must obtain a fresh CURRENT ContextBundle.
   - It must recover the exact active task, governing Decision(s), effective authority/scope, and required dependency state from LARP rather than from the recovery prompt.
   - Evidence must record the recovered refs/fingerprints and project position.

6. **Worker B continues real work correctly.**
   - Complete a concrete repository task whose correct result depends on the post-handoff semantic change.
   - A deterministic verifier/test must prove the produced artifact reflects the current accepted Decision rather than the pre-handoff stale Decision.
   - Worker B must not consume the stale Worker-A ContextBundle as authoritative input.

7. **Governance remains intact after recovery.**
   - If Worker B proposes any semantic mutation, it must use a CURRENT ContextBundle and the ordinary governed proposal/HUMAN/K-01/K-02 path.
   - No direct semantic-state bypass is allowed as evidence of continuity.

8. **Replay remains authoritative.**
   - Replay accepted SemanticEvents from history.
   - Replayed project position must equal live final project position.
   - Replayed logical projection must equal the live canonical logical projection.

9. **Regressions remain clean.**
   - Existing context compiler, adapter/governance, V-01, V-02 and X-01 deterministic suites must still pass.

## Evidence requirements

Commit immutable evidence under a dedicated X-02 run directory. At minimum include:

- Worker A identity/session receipt;
- Worker A ContextBundle + freshness proof;
- exact Worker-A proposal;
- externally supplied HUMAN ApprovalReceipt and governed apply receipt;
- proof that Worker-A bundle became `STALE_BLOCKING`;
- explicit handoff boundary / Worker-A stop receipt;
- exact Worker-B bootstrap prompt proving no semantic answer was restated;
- Worker B identity/session receipt;
- Worker-B fresh ContextBundle + CURRENT verification;
- recovered task/Decision/authority/dependency refs and fingerprints;
- concrete Worker-B repository output;
- deterministic verifier/test output proving use of post-handoff current state;
- final semantic journals/receipts;
- replay proof;
- regression results;
- human-readable `X02_AGENT_CONTINUITY_EVIDENCE.md`;
- immutable Git commit SHA.

## Stronger cross-host evidence

Preferred run:

```text
Worker A: real agent host/model A
        ↓
LARP governed state
        ↓
Worker A disappears
        ↓
Worker B: different real agent host/model B
```

If the run uses only two fresh sessions of the same host/model, X-02 may validate **session continuity**, but it must not claim full cross-model portability unless a second distinct host/model is actually exercised.

## Non-goals

X-02 does not claim:

- OS/filesystem tamper resistance;
- distributed consensus;
- database disaster recovery;
- automatic recovery of unpersisted private chain-of-thought;
- preservation of arbitrary chat history;
- that every agent host behaves identically.

`GAP-X01-PHYSICAL-BOUNDARY` remains a separate open boundary unless separately addressed.

## Relationship to previous criteria

- V-01 proved stale-context detection and rehydration.
- V-02 proved the complete language → runtime → MCP → HUMAN → event → replay path.
- X-01 proved adversarial contract enforcement with a real agent.
- **X-02 adds the missing real-agent continuity test across a worker/session boundary.**

## Verification rule

X-02 remains PROPOSED until explicitly approved by the HUMAN project owner.

After approval it remains ACTIVE until immutable real-agent evidence is committed to GitHub and independently inspected under `TESTING_SOURCE_OF_TRUTH.md`.

If verified:

- verified criteria: `24/25 → 25/25`
- verified coverage: `96/100 → 100/100`
- M7 Validation may close, subject to no separately accepted blocking criterion.
