# X-02 Phase 1 — Worker A Real-Session Prompt

Status: EXECUTION PROMPT
Milestone: M7 Validation
Governing decision: `VALIDATION/X02_DECISION.md`
Protocol: `VALIDATION/X02_CROSS_WORKER_CONTINUITY_PROTOCOL.md`

## Purpose

Run the first half of the accepted X-02 continuity proof with a real coding-agent session.

The continuity property under test is:

> The worker is disposable; governed project state is durable.

This prompt is for **Worker A only**. Worker A must stop at the HUMAN gate before any semantic mutation is accepted.

## Repository and scope

Repository:

`rehhmk/LARP`

This is an authorized local validation of the LARP repository and its dedicated X-02 fixture. Do not target external systems, accounts, services, credentials, networks, or third parties.

Use only the X-02 fixture/runtime and the LARP interfaces already present in the repository.

Read first:

1. `VALIDATION/X02_DECISION.md`
2. `VALIDATION/X02_CROSS_WORKER_CONTINUITY_PROTOCOL.md`
3. `VALIDATION/x02/X02_PHASE0_READINESS_REPORT.md`
4. `VALIDATION/x02/fixture/project.larp`
5. `TESTING_SOURCE_OF_TRUTH.md`

Current accepted technical state:

- X-01: VERIFIED
- X-02: ACCEPTED / ACTIVE / NOT VERIFIED
- X-02 Phase 0 readiness: PASS
- verified criteria: 24 / 25
- verified coverage: 96 / 100
- `GAP-X01-PHYSICAL-BOUNDARY`: OPEN

## HUMAN trust material

A HUMAN-supplied public trust-store JSON will be attached or otherwise supplied to this session.

You may consume the **public trust store only**.

Do not generate replacement canonical HUMAN trust material.
Do not search for, request, read, or access the matching private key.
Do not synthesize a HUMAN ApprovalReceipt.

The matching private key remains outside this environment under human control.

## Branch and evidence directory

Create branch:

`validation/x02-worker-a-run-01`

Use evidence directory:

`VALIDATION/x02/evidence/run-2026-09-14-01/`

Do not reuse X-01 runtime state or evidence as the X-02 canonical run.

## Phase A1 — initialize dedicated X-02 run

From the dedicated X-02 `.larp` fixture and HUMAN-supplied public trust store:

1. initialize a fresh X-02 working runtime;
2. compile the real `VALIDATION/x02/fixture/project.larp` source;
3. bind the source trust-store placeholder to the supplied public trust-store fingerprint for this run;
4. bootstrap accepted seed state through the existing LARP bootstrap path;
5. preserve the original `.larp` seed statement unchanged;
6. record the real Worker-A session/host identity.

The seed Decision must remain the pre-handoff Bearer policy from source.

## Phase A2 — hydrate Worker A

For task:

`task:implement-auth`

and agent:

`agent:coding`

hydrate from LARP and obtain ContextBundle **A0**.

Verify A0 is `CURRENT`.

Record at minimum:

- project id;
- project position;
- task ref;
- agent ref;
- current `decision:auth` ref/version/statement;
- effective task/agent/compile scope;
- effective authority result;
- dependency refs;
- dependency fingerprint;
- A0 bundle fingerprint;
- freshness verification result.

Persist:

- `WORKER_A_SESSION.json`
- `WORKER_A_CONTEXT_A0.json`
- `WORKER_A_CONTEXT_A0_CURRENT.json`

## Phase A3 — create the context-bound post-handoff proposal

Using A0, create exactly one governed proposal changing `decision:auth` from the pre-handoff Bearer policy to:

> Use OAuth2 authorization-code flow with PKCE S256 and DPoP-bound access-token authorization.

The proposal must:

- target `decision:auth`;
- use the exact CURRENT A0 fingerprint;
- use the current expected stream version;
- preserve normal LARP authority/scope checks;
- remain only `PROPOSED`;
- cause zero accepted semantic mutation.

After creating the proposal, prove and record that all of the following are unchanged from immediately before proposal creation:

- accepted SemanticEvent count;
- accepted semantic transaction count;
- project position;
- `decision:auth` stream version;
- canonical projection state.

Persist the exact proposal as:

`WORKER_A_PROPOSAL.json`

Also persist a zero-mutation preflight receipt sufficient for independent inspection.

## Mandatory stop — HUMAN GATE A

Do **not** approve the proposal.
Do **not** apply the proposal.
Do **not** create or simulate HUMAN authority.
Do **not** edit canonical semantic state directly.
Do **not** proceed to the handoff boundary yet.

Commit and push all Worker-A pre-gate evidence to the branch, then stop.

Return exactly this operational summary shape:

```text
X02 WORKER A HUMAN GATE A

branch: validation/x02-worker-a-run-01
headCommit: <immutable sha>
proposalId: <proposal id>
proposalStatement: <exact statement>
contextBundleA0: <fingerprint>
contextFreshness: CURRENT
projectPositionBeforeProposal: <n>
projectPositionAfterProposal: <n>
semanticEventsBeforeProposal: <n>
semanticEventsAfterProposal: <n>
semanticTransactionsBeforeProposal: <n>
semanticTransactionsAfterProposal: <n>
semanticMutationFromProposal: 0
physicalBoundaryGap: OPEN
```

The human will independently inspect the immutable evidence before producing any external signed ApprovalReceipt.

## Important continuity constraint

Do not prepare a free-form handoff summary for Worker B.

Worker B will later receive only the repository/project/task reference plus an instruction to hydrate the current governed state. Worker A's conversation transcript, reasoning, and semantic answer must not be transferred as Worker-B prompt context.
