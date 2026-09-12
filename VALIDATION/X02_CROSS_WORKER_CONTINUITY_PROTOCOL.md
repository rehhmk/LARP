# X-02 — Cross-Worker Cold-Start Continuity Protocol

Status: ACCEPTED EXECUTION PROTOCOL
Milestone: M7 Validation
Governing decision: `VALIDATION/X02_DECISION.md`

## Governing property

> The worker is disposable; governed project state is durable.

X-02 proves continuity across a worker/session boundary. It does not test whether a worker can remember a conversation. It tests whether a fresh worker can recover the current governed project state from LARP and continue correctly without being told the semantic answer by the previous worker or the human.

## Claim boundary

Minimum passing claim:

> Session continuity across two isolated real coding-agent sessions.

Stronger claim, only if actually exercised:

> Cross-host/model continuity across two distinct real coding-agent hosts/models.

Do not claim cross-model portability from two sessions of the same host/model.

`GAP-X01-PHYSICAL-BOUNDARY` remains OPEN and is outside X-02.

---

## Test shape

```text
real *.larp project
      ↓
bootstrap accepted state
      ↓
Worker A
      ↓
CURRENT ContextBundle A0
      ↓
context-bound proposal
      ↓
external HUMAN approval
      ↓
K-01 ACCEPTED → K-02 COMMITTED
      ↓
A0 becomes STALE_BLOCKING
      ↓
WORKER A STOPS / SESSION LOST
      ╳ no transcript transfer
      ╳ no free-form handoff summary
      ╳ no semantic answer restated
      ↓
Worker B · fresh isolated session
      ↓
repo + task reference only
      ↓
hydrate from persisted LARP state
      ↓
CURRENT ContextBundle B0
      ↓
recover current Decision / authority / dependencies
      ↓
complete concrete repository work
      ↓
deterministic verifier proves POST-HANDOFF state used
      ↓
replay accepted history
      ↓
MATCH
```

---

## Dedicated fixture

Use a dedicated X-02 fixture rather than mutating X-01 evidence.

Recommended project shape:

```text
project: x02-continuity-demo

root
└── backend
    ├── agent:coding
    ├── task:implement-auth
    ├── decision:auth
    └── artifact:auth-policy
```

The seed Decision MUST encode the pre-handoff state, for example:

```text
Use OAuth2 authorization-code flow with PKCE S256 and Bearer access-token authorization.
```

Worker A's legitimate proposal MUST change the accepted semantic state to a materially different post-handoff policy, for example:

```text
Use OAuth2 authorization-code flow with PKCE S256 and DPoP-bound access-token authorization.
```

Important: the `.larp` seed source remains the old pre-handoff statement after the semantic transition. The accepted SemanticEvent/projection is therefore the only authoritative source for Worker B's current answer. This prevents a false continuity pass caused by merely rereading edited source.

The task should remain something equivalent to:

```text
task:implement-auth
Goal: implement the authentication policy artifact.
Requires: decision:auth
Uses: artifact:auth-policy
Allowed scope: backend
```

---

## Concrete Worker-B work

Worker B must produce or update a real repository artifact whose behavior differs between the pre-handoff and post-handoff Decision.

Recommended artifact:

```text
VALIDATION/x02/work/auth-policy.js
```

Recommended observable behavior:

- pre-handoff policy would produce Bearer authorization behavior;
- post-handoff policy must produce DPoP authorization behavior and require the DPoP proof input/header;
- PKCE S256 remains required in both states.

A deterministic verifier MUST derive the expected behavior from the live canonical projection/current ContextBundle, not from a hardcoded post-handoff answer supplied to Worker B.

A stale implementation matching the seed/pre-handoff Decision MUST fail the verifier.

---

## Phase 0 — deterministic readiness

Before the real two-worker run, create the minimum dedicated fixture/harness and prove locally that the test can distinguish stale from current behavior.

Required readiness checks:

1. dedicated X-02 `.larp` fixture compiles deterministically;
2. bootstrap creates accepted seed state;
3. initial ContextBundle is CURRENT;
4. the governed HUMAN approval path works with externally supplied signed approval provenance;
5. the semantic Decision can move from pre-handoff state to post-handoff state without editing source;
6. the Worker-A bundle becomes STALE_BLOCKING after the accepted Decision change;
7. a stale/pre-handoff artifact fails the X-02 verifier;
8. a post-handoff/current artifact passes the X-02 verifier;
9. replay reconstructs the same logical projection;
10. existing regression suites remain clean.

Phase 0 readiness does NOT verify X-02. It only proves the fixture can support the real continuity run.

---

## Phase 1 — Worker A

Worker A must be a real coding-agent session.

Worker-A bootstrap prompt may identify:

- repository: `rehhmk/LARP`;
- X-02 protocol file;
- dedicated X-02 task reference;
- instruction to hydrate from LARP and prepare the governed pre-handoff transition.

Worker A must:

1. record real session/host identity;
2. hydrate the dedicated X-02 project/runtime;
3. obtain ContextBundle A0 and verify `CURRENT`;
4. record project position, task ref, Decision ref/version, authority binding, dependency fingerprint and bundle fingerprint;
5. create the exact context-bound proposal for the post-handoff Decision;
6. prove proposal creation caused zero semantic mutation;
7. STOP at HUMAN GATE A.

Worker A must not synthesize HUMAN authority.

### HUMAN GATE A

The human independently reviews the exact proposal id and statement, then produces the signed ApprovalReceipt outside Worker A.

After the receipt is supplied, Worker A may:

1. consume the external approval;
2. apply through the ordinary governed path;
3. prove K-01 ACCEPTED and K-02 COMMITTED exactly the authorized transition;
4. verify A0 is now `STALE_BLOCKING` because `decision:auth` changed;
5. persist the handoff boundary receipt;
6. commit and push all Worker-A evidence;
7. STOP PERMANENTLY for this run.

Worker A performs no additional project reasoning after the recorded handoff boundary.

---

## Handoff boundary

The evidence must explicitly record:

```text
WORKER_A_STOPPED = true
workerAHeadCommit = <sha>
acceptedProjectPosition = <position>
acceptedDecisionVersion = <version>
staleBundleFingerprint = <A0 fingerprint>
```

Forbidden transfer to Worker B:

- Worker-A conversation transcript;
- a free-form summary written by Worker A;
- Worker-A chain-of-thought or scratchpad;
- exact post-handoff Decision statement in the Worker-B prompt;
- Worker-A proposal statement in the Worker-B prompt;
- instructions describing the expected code change (for example, "switch Bearer to DPoP");
- the expected verifier answer.

Allowed persisted project inputs:

- repository contents and committed evidence;
- `.larp` program and IR;
- accepted semantic journals;
- canonical projection/runtime state;
- LARP status/context tools;
- task reference.

---

## Phase 2 — Worker B cold start

Worker B must be a fresh isolated real coding-agent session with no access to Worker A's conversation state.

Preferred stronger configuration:

```text
Worker A: ChatGPT Work / Codex host A
Worker B: a distinct available coding-agent host/model B
```

Minimum accepted configuration:

```text
Worker A: real session A
Worker B: fresh isolated real session B on same host/model
```

The exact Worker-B bootstrap prompt must be committed as evidence and must be semantically minimal. Recommended prompt:

```text
Repository: rehhmk/LARP

Continue X-02 for task `task:implement-auth`.
Hydrate the current LARP project state from the repository/runtime and continue the task from the current governed state.
Do not rely on any previous worker conversation or handoff summary.
Follow `VALIDATION/X02_CROSS_WORKER_CONTINUITY_PROTOCOL.md`.
```

No current Decision answer may be added to this prompt.

Worker B must then:

1. record real session/host identity;
2. inspect the persisted project state itself;
3. request/compile a fresh ContextBundle B0;
4. verify B0 is `CURRENT`;
5. recover and record:
   - `task:implement-auth`;
   - current `decision:auth` version and exact statement;
   - effective scope/authority;
   - required dependency refs;
   - project position;
   - bundle/dependency fingerprints;
6. explicitly prove B0 is not A0 and that A0 remains stale;
7. implement/update the concrete auth-policy artifact from the current governed state;
8. run the deterministic X-02 verifier;
9. verifier must PASS only for behavior consistent with the current post-handoff Decision;
10. record repository diff/artifact fingerprint and verifier output.

Worker B may read normal persisted LARP state. That is the mechanism under test, not a leak.

---

## Governance after recovery

Worker B is not required to create a second semantic mutation merely to prove continuity.

If Worker B does need a semantic mutation, the ordinary rule applies:

```text
CURRENT ContextBundle
→ proposal
→ external HUMAN approval
→ K-01
→ K-02
```

A direct semantic-state bypass cannot count as successful continuation.

---

## Phase 3 — final replay and regressions

After Worker B's concrete work passes:

1. replay all accepted SemanticEvents from the dedicated X-02 run;
2. require live and replayed project positions to match;
3. require logical projections to match;
4. prove the post-handoff Decision is reconstructed from accepted history;
5. run all current deterministic regression suites, including X-01;
6. commit immutable final evidence.

No additional semantic mutation is required solely for replay.

---

## Required evidence directory

Use:

```text
VALIDATION/x02/evidence/run-<date>-01/
```

Minimum artifacts:

```text
WORKER_A_SESSION.json
WORKER_A_CONTEXT_A0.json
WORKER_A_CONTEXT_A0_CURRENT.json
WORKER_A_PROPOSAL.json
HUMAN_APPROVAL.json
WORKER_A_GOVERNED_APPLY.json
WORKER_A_CONTEXT_A0_STALE.json
HANDOFF_BOUNDARY.json
WORKER_B_BOOTSTRAP_PROMPT.txt
WORKER_B_SESSION.json
WORKER_B_CONTEXT_B0.json
WORKER_B_CONTEXT_B0_CURRENT.json
WORKER_B_RECOVERED_STATE.json
WORKER_B_ARTIFACT_DIFF.patch
WORKER_B_VERIFIER_RESULT.json
FINAL_REPLAY_PROOF.json
FINAL_REGRESSIONS.json
X02_AGENT_CONTINUITY_EVIDENCE.md
```

Also preserve relevant final semantic journals/receipts and artifact fingerprints.

---

## Pass criteria

X-02 PASS requires all of the following:

- Worker A was real and context-bound;
- Worker A's proposal caused zero semantic mutation before approval;
- external HUMAN approval produced exactly the accepted governed transition;
- A0 became STALE_BLOCKING;
- Worker A stopped at the recorded handoff boundary;
- Worker B was a fresh isolated real session;
- Worker-B bootstrap prompt did not contain the semantic answer;
- Worker B hydrated a fresh CURRENT B0 from persisted LARP state;
- Worker B recovered the exact current Decision/authority/dependencies without transcript transfer;
- Worker B completed concrete work that deterministically reflects the post-handoff Decision;
- stale/pre-handoff behavior would fail the verifier;
- governance remained intact;
- replay MATCH;
- regressions PASS;
- immutable Git evidence independently inspected.

## Failure conditions

X-02 fails or must be rerun if:

- Worker B receives a human/worker summary that restates the current Decision or expected code change;
- Worker B consumes Worker A's chat transcript as continuity input;
- Worker A continues reasoning after the recorded loss boundary;
- the artifact verifier cannot distinguish stale from current behavior;
- the current Decision is obtained only from edited seed source rather than persisted accepted semantic state;
- replay differs from live canonical projection;
- required evidence is uncommitted or not independently inspectable.

## Verification effect

X-02 remains ACTIVE / NOT VERIFIED until the real two-worker evidence passes independent inspection.

If verified:

- `24/25 → 25/25` criteria;
- `96/100 → 100/100` coverage;
- M7 Validation may close, subject to no separately accepted blocking criterion.
