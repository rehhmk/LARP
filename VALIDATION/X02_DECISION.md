# X-02 Decision — Cross-Worker Cold-Start Continuity

Status: ACCEPTED / ACTIVE
Milestone: M7 Validation

Accepted proposal: `VALIDATION/X02_PROPOSAL.md`
Proposal commit: `371e82a343daf69456b0c72f53717aaaddd96975`
Human decision: `::approve X-02`

## Accepted criterion

> X-02 proves that a LARP project can survive worker/session loss and continue correctly on a fresh independent coding agent without transferring the previous conversation transcript: the new worker hydrates from persisted LARP state, reconstructs the active task/decisions/authority/dependencies, continues from a CURRENT ContextBundle, completes a concrete governed unit of work, and replay from accepted history still matches the final canonical projection.

## Governing continuity property

> The worker is disposable; governed project state is durable.

## Required proof

The accepted run must satisfy the complete proof defined in `VALIDATION/X02_PROPOSAL.md`, including:

1. real context-bound Worker A;
2. one legitimate HUMAN-gated semantic change before handoff;
3. Worker A stop/loss boundary;
4. fresh independent Worker B with no Worker-A conversation transcript or semantic answer restatement;
5. Worker B hydration from persisted LARP state into a fresh CURRENT ContextBundle;
6. correct continuation of a concrete repository task that depends on the post-handoff accepted Decision;
7. deterministic verification that Worker B used the current post-handoff state rather than stale Worker-A context;
8. governance preserved after recovery;
9. replay from accepted SemanticEvents matching final live logical projection;
10. existing regressions remaining clean.

## Claim boundary

A same-host fresh-session run may prove session continuity only. Full cross-model or cross-host portability may be claimed only when the evidence actually uses distinct real hosts/models.

X-02 does not claim OS/filesystem tamper resistance, distributed consensus, database disaster recovery, preservation of private chain-of-thought, or preservation of arbitrary chat history.

`GAP-X01-PHYSICAL-BOUNDARY` remains OPEN unless separately resolved.

## Verification rule

X-02 remains ACTIVE / NOT VERIFIED until immutable real-agent evidence is committed to GitHub and independently inspected under `TESTING_SOURCE_OF_TRUTH.md`.

If verified:

- verified criteria: `24/25 → 25/25`
- verified coverage: `96/100 → 100/100`
- M7 Validation may close, subject to no separately accepted blocking criterion.
