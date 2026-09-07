# V-02 Codex Desktop Real Run

Status: **PREPARED — STOP AT FIRST HUMAN GATE**

This protocol begins the later real coding-agent phase. It does not authorize a HUMAN approval or semantic mutation. Do not run it as part of the V-02 implementation build.

## 1. Reset only from the LARP program

From `VERTICAL_SLICE/v02`:

```bash
npm run reset:real
npm run replay:real
```

Require `RESET_FROM_LARP`, 12 accepted seed events, `contextFreshness: CURRENT`, and `REPLAY_MATCH`. Do not substitute a project JSON fixture. The reset command must compile `source/project.larp`, emit `emitted/project.ir.json`, bootstrap seed events, and derive `run/project.json`.

Before connecting the agent, record:

- current Git HEAD and `git status --short`;
- source, semantic, and IR fingerprints from reset;
- project position `12` and `decision:auth` version `1`;
- `run/project.json` and `run/replayed.project.json` equality;
- 12 lines each in the seed registry, seed validation, seed transaction, and semantic event journals.

## 2. Connect Codex Desktop to the existing adapter

Configure a dedicated Codex Desktop MCP server named `LARP_V02` that executes:

```text
node <ABSOLUTE_REPOSITORY_PATH>/ADAPTER/src/server.js
  --project <ABSOLUTE_REPOSITORY_PATH>/VERTICAL_SLICE/v02/run/project.json
  --runtime-dir <ABSOLUTE_REPOSITORY_PATH>/VERTICAL_SLICE/v02/run/.larp/runtime
  --coverage 88
```

Use repository root as the working directory. Restart or reconnect Codex Desktop so this exact generated projection is used, and use only `LARP_V02` for the calls below.

## 3. Real agent hydration and concrete work

The real Codex Desktop agent must make actual MCP calls, preserving the returned receipts:

1. `larp_status`; require project `v02-demo`, position `12`, coverage `88`, and `semanticMutationAllowed: false`;
2. `larp_get_context` with task `task:implement-auth`, agent `agent:coding`, scope `backend`;
3. save the exact returned bundle as `run/B0.json`;
4. `larp_verify_context` for B0 and require `CURRENT`.

Using that ContextBundle, implement `isValidPkceVerifier` in `work/auth-policy.js`. Run:

```bash
node work/verify-auth-policy.js run/project.json work/auth-policy.js
```

The verifier must change from its deliberate initial failure to `PASS` through real agent code work.

Save the exact code diff as `run/B0_WORK_DIFF.txt`. The work may change repository code, but it must not edit `source/project.larp`, any accepted semantic journal, or an approval receipt.

## 4. Context-bound proposal

Before the proposal, record byte hashes for `run/project.json` and `semantic_events.jsonl`, plus line counts for all runtime journals.

The agent may call `larp_propose` with:

- `commandType: decision.propose_change`;
- `targetId: decision:auth`;
- `expectedStreamVersion: 1`;
- `payload.statement: Use OAuth2 authorization-code flow with PKCE S256 and enforce RFC 7636 verifier syntax.`;
- `reason: V-02 real-agent language-to-runtime governed mutation`;
- B0's `contextBundleFingerprint`, passing the full B0 bundle if the MCP process restarted.

Require a persisted receipt with:

- `status: PROPOSED`;
- `contextFreshnessAtProposal: CURRENT`;
- `semanticMutationApplied: false`;
- `governanceRequired: true`.

Confirm that proposal creation does not append a SemanticEvent and does not change `run/project.json`.

Persist the pre-gate evidence under `evidence/run-<date>-01/`, including:

- Git/source/IR/bootstrap provenance;
- B0 and its CURRENT verification receipt;
- initial verifier failure and post-work PASS output;
- `B0_WORK_DIFF.txt`;
- journal counts and hashes before/after proposal;
- the exact proposal receipt;
- the real Codex task/session identity;
- a short `PHASE1_AGENT_EVIDENCE.md`.

Commit the evidence to an evidence branch if requested, but do not add an approval file or call the apply path.

## FIRST HUMAN GATE — STOP

Stop after reporting the exact proposal ID and evidence paths. The coding agent must not create, edit, infer, or simulate a HUMAN approval receipt. Do not invoke the governed apply path until the human separately approves that exact proposal. Do not mark V-02 VERIFIED.

Return exactly:

```text
V02 HUMAN GATE
proposalId: <exact proposal id>
statement: Use OAuth2 authorization-code flow with PKCE S256 and enforce RFC 7636 verifier syntax.
```

This document intentionally ends at the first human gate. Post-approval execution requires a separate instruction after a pre-existing HUMAN approval has been supplied.
