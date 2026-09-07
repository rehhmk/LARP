# V-02 Real Codex Run — Language → Runtime Vertical Slice

Status: **RUN ONLY AFTER V-02 IMPLEMENTATION IS MERGED TO `main`**

Goal: prove the accepted V-02 causal chain with a real Codex Desktop agent. Do not synthesize HUMAN approvals.

## 0. Reset from the real `.larp` source

From repository root:

```bash
cd VERTICAL_SLICE/v02
npm run reset:real
```

Expected properties:

- `status = RESET`
- `projectId = v02-demo`
- `projectPosition = 12`
- `decisionAuthVersion = 1`
- `bootstrapStatus = MATERIALIZED`
- `bootstrapEvents = 12`
- source fingerprint matches the committed `program/auth.larp` compile result

The disposable `run/project.json` MUST be created by compiler + governed bootstrap. Do not hand-author or copy a semantic project fixture.

## 1. MCP server

Create/use a dedicated Codex Desktop STDIO server named `LARP_V02`:

Command:

```text
node
```

Arguments:

```text
<REPO>/ADAPTER/src/server.js
--project
<REPO>/VERTICAL_SLICE/v02/run/project.json
--runtime-dir
<REPO>/VERTICAL_SLICE/v02/run/.larp/runtime
--coverage
88
```

Working directory:

```text
<REPO>
```

Fully restart Codex Desktop after changing MCP configuration.

## 2. Agent phase — source → context → concrete work → proposal → STOP

The real coding agent must perform these steps in order.

### 2.1 Establish provenance

1. Record current Git HEAD and `git status --short`.
2. Read `VERTICAL_SLICE/v02/program/auth.larp`.
3. Read `VERTICAL_SLICE/v02/run/program.ir.json`.
4. Confirm `run/project.json` exists only because `npm run reset:real` compiled and bootstrapped the `.larp` source.
5. Record the source fingerprint and project position.

### 2.2 Live LARP calls

Use **only `LARP_V02`** for LARP MCP calls.

1. `larp_status`
   - require `projectId = v02-demo`
   - require `projectPosition = 12`
   - require `verifiedCoverage = 88`
   - require `semanticMutationAllowed = false`
2. `larp_get_context`
   - `taskId = task:implement-auth`
   - `agentId = agent:coding`
   - `scopeId = backend`
3. Save the exact returned bundle as `run/B0.json`.
4. `larp_verify_context` on B0.
5. Require `CURRENT`.

### 2.3 Start concrete repository work

Edit `VERTICAL_SLICE/v02/work/auth-policy.js` while preserving current semantics:

- `flow = 'authorization_code'`
- `pkce = 'S256'`
- `dpop = false`
- `governingDecisionVersion = 1`
- add `sourceProgram: 'v02.auth'`

Run:

```bash
node work/verify-auth-policy.js run/project.json work/auth-policy.js
```

Require PASS.

Save the work diff to `run/B0_WORK_DIFF.txt`.

### 2.4 Create governed proposal

Call `larp_propose` with:

- `commandType = decision.propose_change`
- `targetId = decision:auth`
- `expectedStreamVersion = 1`
- `payload.statement = Use OAuth2 authorization-code flow with PKCE S256 and DPoP-bound access tokens.`
- `reason = V-02 real-agent language-to-runtime governed mutation`
- `contextBundleFingerprint = B0.bundleFingerprint`
- pass the full B0 bundle if needed after MCP process restart

Require:

- `status = PROPOSED`
- `semanticMutationApplied = false`
- `governanceRequired = true`
- `contextFreshnessAtProposal = CURRENT`

### 2.5 Prove proposal did not mutate semantics

Before and after proposal creation, count:

- semantic events
- semantic transactions
- validation receipts
- human approvals

At this point there must still be exactly the 12 bootstrap semantic events and zero HUMAN approval for the proposal.

Persist Phase 1 evidence under:

```text
VERTICAL_SLICE/v02/evidence/run-<date>-01/
```

At minimum preserve:

- `B0.json`
- `B0_WORK_DIFF.txt`
- source/IR fingerprint receipt
- pre/post proposal journal counts
- exact proposal receipt
- `PHASE1_AGENT_EVIDENCE.md`

Commit these evidence files to GitHub `main` or to an evidence branch that is merged to `main` before verification.

### 2.6 STOP at the human gate

Return exactly:

```text
V02 HUMAN GATE
proposalId: <exact proposal id>
statement: Use OAuth2 authorization-code flow with PKCE S256 and DPoP-bound access tokens.
```

**STOP.**

Do not create, edit, replace, or synthesize a HUMAN approval.
Do not call the governed apply path before the explicit human approval exists.

---

## 3. Post-approval phase — only after a pre-existing HUMAN receipt is supplied

This phase must be executed in the same real run, without reset.

1. Verify the HUMAN approval file existed before this phase and matches the exact proposal ID.
2. Hash the approval receipt before execution; do not modify it.
3. Consume it through the existing governed apply CLI/path.
4. Require:
   - K-01/validation `ACCEPTED`
   - transaction `COMMITTED`
   - exactly one new `decision.changed` event
   - project position `12 → 13`
   - `decision:auth` version `1 → 2`
   - causation = proposal ID
   - correlation = HUMAN approval ID
5. Verify B0 after the event; require `STALE_BLOCKING` on `decision:auth`.
6. Rehydrate B1 through `LARP_V02`; require `CURRENT`.
7. Before adapting code, run the semantic-aware verifier; it must FAIL because DPoP/version changed.
8. Adapt `work/auth-policy.js`:
   - preserve `sourceProgram: 'v02.auth'`
   - set `dpop = true`
   - set `governingDecisionVersion = 2`
9. Run verifier; require PASS.

## 4. Source/history authority-separation proof

With semantic history now containing the approved `decision.changed` event:

### 4.1 Recompile unchanged source

Compile the unchanged committed source again.

Then explicitly bootstrap that identical IR against the existing runtime:

```bash
node scripts/bootstrap.js run/program.ir.json run/project.json run/.larp/runtime
```

Require:

- `ALREADY_MATERIALIZED`
- `appendedEvents = 0`
- current decision remains version 2 with DPoP
- project position remains 13

This proves recompiling/reloading source does not perform desired-state reconciliation or rewrite accepted history.

### 4.2 Changed materialized seed must diverge

Create a temporary copy of `program/auth.larp` and change the original seed statement itself to include DPoP. Do not modify the committed source.

Compile the temporary source to a temporary IR, then call explicit bootstrap against the existing runtime.

Require:

```text
SEED_DIVERGENCE
```

for `decision:auth`, with zero journal/projection mutation.

Delete the temporary source/IR after evidence is captured.

## 5. Replay-from-zero proof

Run:

```bash
npm run replay:real
```

Require:

- `status = REPLAY_MATCH`
- `sameProjection = true`
- replayed project position = 13
- replayed `decision:auth` version = 2
- replayed statement = approved DPoP statement

The replay must consume accepted semantic history, not the current project projection as an authority source.

## 6. Final regression and evidence

Run in order:

```bash
(cd COMPILER && npm test)
(cd ADAPTER && npm test)
(cd ADAPTER && node --test test/governance.test.js)
(cd VERTICAL_SLICE/v01 && npm test)
(cd VERTICAL_SLICE/v02 && npm test)
```

Preserve final:

- source `.larp`
- generated IR
- bootstrap journals and seed registry
- B0 + B1
- HUMAN approval receipt + before/after hash proof
- governed apply result
- semantic events / transactions / validation receipts
- source-recompile no-op proof
- `SEED_DIVERGENCE` proof
- replay result and replayed projection
- concrete work diff + verifier outputs
- regression output
- real Codex session/thread identity
- final evidence report

Commit evidence to GitHub.

Final agent output after evidence is committed:

```text
V02 FINAL EVIDENCE COMMITTED
commit: <sha>
sourceFingerprint: <sha256>
projectPosition: 13
decisionVersion: 2
replay: MATCH
```

V-02 remains unverified until ChatGPT independently inspects that immutable evidence commit against `V02_DECISION.md`.
