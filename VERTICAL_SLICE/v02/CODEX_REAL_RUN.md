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

## 2. Connect Codex Desktop to the existing adapter

Configure a Codex Desktop MCP server that executes:

```text
node <ABSOLUTE_REPOSITORY_PATH>/ADAPTER/src/server.js
  --project <ABSOLUTE_REPOSITORY_PATH>/VERTICAL_SLICE/v02/run/project.json
  --runtime-dir <ABSOLUTE_REPOSITORY_PATH>/VERTICAL_SLICE/v02/run/.larp/runtime
  --coverage 88
```

Restart or reconnect Codex Desktop so this exact generated projection is used.

## 3. Real agent hydration and concrete work

The real Codex Desktop agent must make actual MCP calls, preserving the returned receipts:

1. `larp_status`;
2. `larp_get_context` with task `task:implement-auth`, agent `agent:coding`, scope `backend`;
3. `larp_verify_context` for the returned bundle and require `CURRENT`.

Using that ContextBundle, implement `isValidPkceVerifier` in `work/auth-policy.js`. Run:

```bash
node work/verify-auth-policy.js run/project.json work/auth-policy.js
```

The verifier must change from its deliberate initial failure to `PASS` through real agent code work.

## 4. Context-bound proposal

The agent may call `larp_propose` with the current bundle fingerprint, command `decision.propose_change`, target `decision:auth`, expected stream version `1`, and a proposed statement that makes the implemented RFC 7636 verifier constraint explicit.

Require a persisted receipt with:

- `status: PROPOSED`;
- `contextFreshnessAtProposal: CURRENT`;
- `semanticMutationApplied: false`;
- `governanceRequired: true`.

Confirm that proposal creation does not append a SemanticEvent and does not change `run/project.json`.

## FIRST HUMAN GATE — STOP

Stop after reporting the exact proposal ID and evidence paths. The coding agent must not create, edit, infer, or simulate a HUMAN approval receipt. Do not invoke the governed apply path until the human separately approves that exact proposal. Do not mark V-02 VERIFIED.
