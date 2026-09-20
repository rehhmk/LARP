# X-01 Phase 0 — Build Report

Status: BUILD PASS / X-01 ACTIVE / NOT VERIFIED
Milestone: M7 Validation
Accepted criterion: `VALIDATION/X01_DECISION.md`
Protocol: `VALIDATION/X01_ADVERSARIAL_REAL_AGENT_PROTOCOL.md`

## Build identity

- Starting main SHA: `92cd4aad3e4a6f8b95956de2e0ffc5277947fd39`
- Implementation head SHA: `51398bc294d04d4c1675d9c8620969415b966fa4`
- Implementation branch: `build/x01-phase0-enforcement`
- Implementation PR: [#6](https://github.com/rehhmk/LARP/pull/6)
- Merge commit on main: `7902d5905a10df029afe3cfc2a85679833a099bb`

The implementation was built from the readiness-report checkpoint and merged only after its dedicated regression workflow passed. This report records readiness evidence; it does not verify X-01.

## Files changed

Implementation commit `51398bc294d04d4c1675d9c8620969415b966fa4` changed:

- `.github/workflows/x01-phase0.yml`
- `ADAPTER/src/apply-approved-proposal.js`
- `ADAPTER/src/approval-provenance.js`
- `ADAPTER/src/authority.js`
- `ADAPTER/src/context-compiler.js`
- `ADAPTER/src/governance.js`
- `ADAPTER/src/runtime.js`
- `ADAPTER/test/governance.test.js`
- `TEST_EVIDENCE_LEDGER.md`
- `VALIDATION/x01/X01_PHASE0_IMPLEMENTATION_REPORT.md`
- `VALIDATION/x01/fixture/project.larp`
- `VALIDATION/x01/package.json`
- `VALIDATION/x01/test/phase0.test.js`
- `VERTICAL_SLICE/v01/test/v01-local.test.js`

This file is a documentation-only follow-up that supplies the exact evidence path and fields required by the accepted build request.

## Human approval provenance design

A JSON claim such as `actor.kind = HUMAN` is insufficient. The governed apply path requires a signed ApprovalReceipt whose provenance is verified before K-01 accepts a transition.

The minimum design is:

```text
Human
→ trusted external control plane signs ApprovalReceipt
→ governed runtime verifies the receipt
→ K-01 deterministic validation
→ SemanticTransaction
→ SemanticEvent
→ projection
```

The receipt uses Ed25519 and binds the complete canonicalized approval, including the approval id, proposal id, approval decision, actor identity, reason, scheme, algorithm, and key id. The actor id must equal the signing key id.

The runtime also verifies that:

1. the supplied trust store matches the SHA-256 fingerprint pinned by exactly one active canonical `Authority` node;
2. the selected key is active and configured for Ed25519;
3. the ApprovalReceipt signature verifies with that trusted public key.

A fabricated unsigned HUMAN object rejects with `APPROVAL_PROVENANCE_UNTRUSTED`. An invalid signature rejects with `APPROVAL_SIGNATURE_INVALID`. A substituted trust store rejects with `APPROVAL_TRUST_ANCHOR_MISMATCH`.

## Exact signing and verification boundary

- Signing private key: held by the external trusted human control plane; it is not an input to the runtime and is not stored in the repository.
- Approval issuance: `signHumanApproval` defines the receipt format used by the trusted issuer. Test suites create ephemeral in-memory keys only as fixtures.
- Runtime verification material: the runtime receives the signed receipt and a public-key trust store.
- Canonical trust binding: current semantic state pins the trust-store fingerprint on an active `Authority` node.
- Authoritative verification: `verifyHumanApprovalProvenance` runs inside `evaluateApprovedProposal` before candidate state, journals, transactions, events, or projection writes are produced.

This boundary assumes the worker cannot access the external signing private key. OS-level protection of local project files and verification material remains outside this phase.

## Effective scope enforcement algorithm

At proposal time:

1. resolve the current canonical task, agent, target, scope graph, and task `allowedScope`;
2. derive task scope, authoritative allowed scope, agent scope, ContextBundle compile scope, and target scope;
3. require the target scope to be equal to or a descendant of every effective boundary;
4. append the proposal only when authorization is `ALLOW`;
5. retain the task ref, agent ref, ContextBundle fingerprint, compile scope, target ref, target scope, and derived authority binding.

At apply time:

1. reload current canonical state;
2. re-resolve the task, agent, target, scope graph, and authoritative task `allowedScope`;
3. compare every re-derived binding field with the proposal's observed binding;
4. reject binding drift with `AUTHORITY_CONTEXT_CHANGED`;
5. re-run the descendant/equality scope check;
6. reject an out-of-scope target with `AUTHORITY_DENIED`;
7. continue through K-01 only after provenance and scope checks pass.

Proposal-supplied scope strings are never treated as authoritative. The X-01 fixture has sibling `backend` and `frontend` scopes, retains the backend auth task and Decision, and adds a meaningful frontend Decision target. Backend-to-backend is allowed; backend-to-frontend is denied.

## Rejection codes

- `HUMAN_APPROVAL_REQUIRED`
- `AUTHORITY_DENIED`
- `APPROVAL_PROVENANCE_UNTRUSTED`
- `APPROVAL_SIGNATURE_INVALID`
- `APPROVAL_TRUST_ANCHOR_MISMATCH`
- `APPROVAL_TRUST_NOT_CONFIGURED`
- `AUTHORITY_CONTEXT_INVALID`
- `AUTHORITY_CONTEXT_CHANGED`
- `CONTEXT_STALE_BLOCKING`
- `SEED_DIVERGENCE`

All tested provenance and scope rejection paths append zero semantic validation acceptances, zero semantic transactions, and zero SemanticEvents, and leave the canonical projection unchanged. Proposal-time scope denial also appends zero proposals.

## Tests and counts

Local deterministic results recorded by the implementation:

- Context compiler: **12/12 PASS**
- MCP adapter: **15/15 PASS**
- Governance and Phase 0 unit tests: **14/14 PASS**
- V-01: **5/5 PASS**
- V-02: **11/11 PASS**
- X-01 Phase 0 deterministic harness: **6/6 PASS**
- Aggregate: **63/63 PASS**

The suites prove fabricated HUMAN rejection, legitimate trusted HUMAN liveness, non-HUMAN rejection, backend-to-frontend denial, backend-to-backend success, rejection atomicity, stale-context enforcement, seed/source-history separation, and V-01/V-02 compatibility.

## CI evidence

All relevant workflows for implementation head `51398bc294d04d4c1675d9c8620969415b966fa4` completed successfully:

- X01 Phase 0 Enforcement — run `34170777947`, job `101890509094`: **SUCCESS**
- V01 Build Verification — run `34170777973`, job `101890509114`: **SUCCESS**
- V02 Build Verification — run `34170777917`, job `101890508968`: **SUCCESS**

The dedicated X-01 job passed context compiler, adapter, governance, V-01, V-02, and isolated X-01 Phase 0 steps.

## Regression result

- `STALE_BLOCKING → CONTEXT_STALE_BLOCKING` remains enforced.
- Source compilation remains distinct from accepted semantic mutation.
- Changed already-materialized seeds remain rejected with `SEED_DIVERGENCE`.
- No desired-state reconciliation was introduced.
- Existing V-01 and V-02 behavior remains compatible.

## Open boundary and verification status

`GAP-X01-PHYSICAL-BOUNDARY` remains **OPEN**.

This build protects canonical semantic acceptance through LARP authoritative interfaces. It does not claim that a worker with unrestricted operating-system access cannot physically edit local files, replace runtime state, steal keys, or compromise the OS user.

X-01 remains **ACTIVE / NOT VERIFIED**. The real adversarial-agent run has not started and is still required before independent verification or any coverage increase.
