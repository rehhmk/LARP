# A-02 Human-Gated Proposal -> SemanticEvent Verification

## Current proposal under test

Use the real A-01 proposal already committed at:

`ADAPTER/.larp/runtime/proposals.jsonl`

Proposal ID:

`proposal:d29bd255-e1da-43b9-a62b-fa25c34e2499`

Observed target:

- project: `demo`
- target: `decision:auth`
- expected stream version: `2`
- observed project position: `42`
- proposed statement: `Use OAuth2 authorization-code flow with PKCE using the S256 code challenge method.`

## Human gate

Do not apply this proposal until an explicit human approval exists as a committed JSON receipt under:

`ADAPTER/.larp/control/approvals/`

Required shape:

```json
{
  "approvalId": "approval:<stable-id>",
  "proposalId": "proposal:d29bd255-e1da-43b9-a62b-fa25c34e2499",
  "approved": true,
  "actor": {
    "kind": "HUMAN",
    "id": "human:project-owner",
    "name": "Project Owner"
  },
  "reason": "Explicit approval for A-02 external verification"
}
```

The coding agent must not create or edit this approval receipt.

## After human approval is committed

Codex should pull the approved commit and run:

```bash
node src/apply-approved-proposal.js \
  --project examples/project.json \
  --runtime-dir .larp/runtime \
  --proposal proposal:d29bd255-e1da-43b9-a62b-fa25c34e2499 \
  --approval-file .larp/control/approvals/<approval-file>.json
```

## Required evidence

The resulting evidence commit must include:

- the immutable approval receipt
- `human_approvals.jsonl`
- `semantic_validation_receipts.jsonl`
- `semantic_transactions.jsonl`
- `semantic_events.jsonl`
- updated `examples/project.json` projection fixture
- `A02_EXTERNAL_AGENT_EVIDENCE.md`

The evidence report must prove:

- approval actor is HUMAN
- proposal ID matches the A-01 proposal
- project hash/position and expected target stream version matched before apply
- validation result is ACCEPTED
- semantic transaction status is COMMITTED
- exactly one event is emitted for this transaction
- event type is `decision.changed`
- event causation references the proposal
- event correlation references the approval
- target stream version changes `2 -> 3`
- project position changes `42 -> 43`
- decision statement changes from `Use OAuth2` to the approved PKCE statement
- the coding agent did not create the approval receipt

A-02 remains unverified until ChatGPT inspects this committed evidence on GitHub.
