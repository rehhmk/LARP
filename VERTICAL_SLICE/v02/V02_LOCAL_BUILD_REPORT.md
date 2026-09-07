# V-02 Local/CI Build Report

Status: **PASS — IMPLEMENTATION READY FOR REAL-AGENT EXECUTION**

Criterion: accepted `V-02 · Language → Runtime Vertical Slice`
Coverage effect: **none yet** — remains `22/25 = 88/100` until real-agent evidence is independently verified.

## Implemented causal bridge

```text
program/auth.larp
→ deterministic compiler
→ LARP IR
→ explicit governed seed bootstrap
→ semantic event history
→ replay-derived project projection
→ existing Context Compiler
→ existing MCP adapter
→ context-bound proposal
→ existing HUMAN-gated governance path
→ SemanticEvent
→ replay-equivalent projection
```

No hand-authored semantic JSON project fixture is used by the V-02 reset path.

## Source/compiler evidence

Real source:

- `VERTICAL_SLICE/v02/program/auth.larp`

Compiler:

- `VERTICAL_SLICE/v02/src/compiler.js`
- strict LARP v0.1 slice grammar
- deterministic canonical semantic fingerprint
- invalid input yields structured `CompileError`

CI source fingerprint:

```text
be3be00fa3f53e58c1b52cafd34a2bda41779e46d784d01bdf4026385147cd41
```

The compile smoke test emitted the same semantic/source fingerprint.

## Governed bootstrap

Implementation:

- `VERTICAL_SLICE/v02/src/bootstrap.js`
- explicit `seed.materialize` validation receipts
- committed semantic transactions
- append-only `scope.seeded`, `node.seeded`, and `relation.seeded` events
- deterministic seed identities/fingerprints
- `seed_registry.jsonl`
- identical materialized seed → `ALREADY_MATERIALIZED`, zero append
- changed materialized seed → `SEED_DIVERGENCE` before mutation

The source program currently materializes **12 bootstrap events**:

- 2 scopes
- 6 nodes
- 4 relations

## Replay

Implementation:

- `VERTICAL_SLICE/v02/src/replay.js`
- `VERTICAL_SLICE/v02/scripts/replay-real-run.js`

Replay consumes semantic event history and reconstructs the logical project projection, including later `decision.changed` events.

## Existing runtime integration

V-02 intentionally reuses already-verified components instead of creating a parallel runtime:

- `ADAPTER/src/context-compiler.js`
- `ADAPTER/src/runtime.js`
- `ADAPTER/src/governance.js`
- `ADAPTER/src/server.js`

The local V-02 harness proves source-derived state can produce a CURRENT ContextBundle, a context-bound non-mutating proposal, a HUMAN-approved deterministic semantic change, and a replay-equivalent final projection.

## V-02 tests

`VERTICAL_SLICE/v02/test/v02-local.test.js`:

1. **V02-L01** real `.larp` → deterministic loadable IR
2. **V02-L02** invalid source → compiler diagnostic / no IR
3. **V02-L03** governed bootstrap + identical-seed no-op
4. **V02-L04** compile is non-mutating + changed seed → `SEED_DIVERGENCE`
5. **V02-L05** source-derived state → ContextBundle → proposal → HUMAN governance → SemanticEvent → replay match
6. **V02-L06** independent clean bootstraps produce the same logical projection

Result: **6/6 PASS**.

## Final regression CI

Workflow:

- `.github/workflows/v02-build.yml`
- final PR-head run: `34157799894`
- final job: `101853133174`
- conclusion: **SUCCESS**

Substantive test results:

- Context compiler: **12/12 PASS**
- MCP adapter: **15/15 PASS**
- governance: **9/9 PASS**
- V-01: **5/5 PASS**
- V-02: **6/6 PASS**
- source compile smoke test: **PASS**

Total deterministic tests: **47/47 PASS** plus compile smoke PASS.

The legacy V-01 workflow also passed on the final PR head.

## Merge evidence

- PR: `#3 build(v02): language-to-runtime vertical slice`
- implementation PR head: `027682ccf7895eca08bef2ac30d93e9347a0e973`
- merge commit: `e3d28fa94711761049e07aa9de7a60a497a3e60a`

## Real-run support

- `scripts/reset-real-run.js` deletes disposable runtime state, compiles the committed `.larp` source, writes derived IR, and bootstraps the runtime from accepted seed events.
- `scripts/bootstrap.js` exposes explicit bootstrap for no-op/divergence evidence.
- `scripts/replay-real-run.js` compares current projection with replay-from-history.
- `CODEX_REAL_RUN.md` defines the real Codex + HUMAN gate protocol.
- `work/verify-auth-policy.js` checks concrete work against the current semantic decision and stream version.

## What remains before V-02 can be VERIFIED

Implementation tests are not a substitute for the accepted real-agent gate.

Required external proof still pending:

```text
real .larp
→ compile + governed bootstrap
→ real Codex receives source-derived ContextBundle via LARP_V02
→ concrete repository work
→ context-bound non-mutating proposal
→ explicit HUMAN approval that pre-exists apply
→ ACCEPTED / COMMITTED decision.changed event
→ stale old context + rehydrate
→ concrete work adapts
→ unchanged source bootstrap is no-op (history preserved)
→ changed seed is SEED_DIVERGENCE
→ replay from zero = same final projection
→ committed evidence
→ independent verification
```

Therefore current status is:

```text
V-02 ACTIVE — IMPLEMENTATION PASS / REAL AGENT EXECUTION PENDING
coverage = 88/100
```
