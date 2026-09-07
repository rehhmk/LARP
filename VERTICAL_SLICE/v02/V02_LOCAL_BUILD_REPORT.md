# V-02 Local Build Report

Status: **IMPLEMENTATION PASS — REAL AGENT EXECUTION PENDING**

Roadmap criterion: V-02

Verified coverage remains: **22 / 25 = 88 / 100**

This report does not mark V-02 VERIFIED and contains no HUMAN approval.

## Architecture implemented

The isolated V-02 implementation preserves four separate authorities:

```text
DECLARATIVE PROGRAM       source/project.larp
        ↓ explicit compile
LARP IR                   emitted/project.ir.json
        ↓ explicit governed bootstrap
SEMANTIC HISTORY          run/.larp/runtime/semantic_events.jsonl
        ↓ deterministic replay/projection
DERIVED MATERIALIZATION   run/project.json
        ↓ read-only context compilation / MCP adapter
RUNTIME EXECUTION INPUT   run/context-bundle.json
```

- `src/compiler.js` implements the executable v0.1 source compiler, canonical source normalization, diagnostics, semantic fingerprinting, and canonical IR fingerprinting. `COMPILER/` was inspected first and contains the previously verified Context Compiler only; the repository has no prior `.larp` language parser to reuse. The V-02 parser is therefore isolated rather than presented as a second replacement for an existing language compiler.
- `src/bootstrap.js` is the explicit governance boundary. It validates IR fingerprints, references, scope topology, prior accepted history, stable typed seed identities, and seed fingerprints before append.
- Bootstrap writes append-only accepted facts to `semantic_events.jsonl`, with separate `seed_validation_receipts.jsonl`, `seed_transactions.jsonl`, and `seed_registry.jsonl` receipts. Identical materialization returns `ALREADY_MATERIALIZED` without rewriting the projection. A changed fingerprint for an existing typed seed returns `SEED_DIVERGENCE` before mutation.
- `src/projection.js` applies supported SemanticEvents with exact project-position and stream-version checks. `src/replay.js` reconstructs an empty projection from accepted history.
- `scripts/reset-real-run.js` deletes disposable V-02 run materialization, compiles the real source, bootstraps seed history, derives `run/project.json`, compiles and verifies a ContextBundle, and resets only the non-semantic JavaScript work fixture.
- `ADAPTER/src/server.js` consumes the generated `run/project.json` directly. No adapter-specific semantic fixture conversion exists.

## Deterministic artifact fingerprints

- Source content SHA-256 / `sourceFingerprint`: `75658600482aa3dc7a3651ad04e98967ec90075275a275d3570ed20477fb0948`
- Semantic program fingerprint: `f99d7b2c4c63fa5c816dee7bfe728e4c7ad366e8e0420d8d22f13a0530bd4fd1`
- Canonical IR fingerprint / `irFingerprint`: `a7fbbbac729869ff16776a684721b354df54066c69ea19b91767411a313dc32b`
- Pretty-printed emitted IR file SHA-256: `d224895886266c85ad916fe1a691b9bcf9b1424baeae2532c8aaf513edce1e39`
- Live and replayed project file SHA-256: `4428cd2d03a0dbb1578d8d51b44870429bd197b42e4bbf988413e835036a6d00`
- ContextBundle fingerprint: `2235821de2ad07f0e0f3f2d65363653ee8b4111659f667b5bb94db0837c9b34c`
- Replayed logical projection fingerprint: `07b766739faf1ebceda7b9dabb5cbca693fed7ad761efc9fe034d5403e59f780`

## Commands executed

Repository preparation:

```bash
git fetch origin --prune
git switch build/v02-language-runtime
git pull --ff-only
```

Local verification:

```bash
cd COMPILER && npm test
cd ADAPTER && npm test
cd ADAPTER && node --test test/governance.test.js
cd VERTICAL_SLICE/v01 && npm test
cd VERTICAL_SLICE/v02 && npm test
cd VERTICAL_SLICE/v02 && npm run reset:real
cd VERTICAL_SLICE/v02 && npm run replay:real
cd VERTICAL_SLICE/v02 && npm run compile
cd VERTICAL_SLICE/v02 && npm run bootstrap
```

Artifact audit:

```bash
shasum -a 256 source/project.larp emitted/project.ir.json run/project.json run/replayed.project.json
wc -l run/.larp/runtime/*.jsonl
git diff --no-index -- run/project.json run/replayed.project.json
find fixture -type f -print
```

## Test results

| Suite | Result |
|---|---:|
| COMPILER context compiler | 12 / 12 PASS |
| ADAPTER MCP runtime | 15 / 15 PASS |
| ADAPTER governance | 9 / 9 PASS |
| V-01 regression | 5 / 5 PASS |
| V-02 language-runtime harness | 11 / 11 PASS |
| Total | **56 / 56 PASS** |

V-02 tests prove V02-L01 through V02-L09 plus direct existing-server compatibility (V02-L10) and tampered-IR rejection (V02-L11).

## Bootstrap and replay evidence

- Bootstrap result: `MATERIALIZED`
- Accepted seed SemanticEvents: `12`
- Seed validation receipts: `12`, all `ACCEPTED`
- Seed transactions: `12`, all `COMMITTED`, one event each
- Stable seed registry entries: `12`
- Initial project position: `12`
- `decision:auth` stream version: `1`
- `task:implement-auth` stream version: `1`
- Context verification: `CURRENT`, severity `NONE`, changes `[]`
- Replay result: `REPLAY_MATCH`
- Live versus replayed logical projection: equal; committed pretty-printed artifacts are byte-identical

## Proof there is no semantic JSON source shortcut

`fixture/` contains only `auth-policy.initial.js`; it contains no JSON file. The only authored semantic declaration is `source/project.larp`. `scripts/reset-real-run.js` accepts no project-template argument and contains no project copy operation. It obtains IR by calling the compiler, passes that IR through `bootstrapIr`, and writes `run/project.json` only from the projection returned by replaying accepted seed events. V02-L09 executes this reset into a new temporary runtime and compares the generated project to a fresh replay of its journal.

V02-L06 separately proves that compiling a changed source variant without bootstrapping leaves both accepted semantic history and the current projection byte-for-byte unchanged. V02-L05 then submits that changed seed to bootstrap and proves `SEED_DIVERGENCE` with zero journal or projection rewrite.

## Failures encountered and fixes

- The required branch was not initially present locally. No files were changed; `git fetch origin --prune` exposed the remote branch, after which the required switch and fast-forward pull succeeded.
- The partial branch scaffold rewrote `project.json` during an identical bootstrap rerun. The completed implementation makes the `ALREADY_MATERIALIZED` path read-only, and V02-L04 locks every journal and the projection byte-for-byte.
- The initial scaffold sorted scopes lexically, which could place a child seed before its parent. Compilation now emits deterministic topological scope order and rejects cycles before IR/bootstrap acceptance.
- A concurrent implementation reached `main` while this build was in progress. Its local V-02 test synthesized a `HUMAN` actor and executed `applyApprovedProposal`, crossing the explicit build-phase stop. The corrective implementation preserves that Git history but removes the synthetic approval/apply path; V02-L01–L11 stop at MCP-compatible context and leave the real proposal/HUMAN gate to `CODEX_REAL_RUN.md`.
- No final test failures remain. Existing suites required no weakening or behavior changes.

## Limitations and next gate

- The language parser covers the isolated v0.1 declarations required by this slice; it is not claimed as a production-complete grammar or package/import resolver.
- Journals are local JSONL prototype stores; production crash recovery, locking, and multi-process concurrency are outside V-02.
- MCP continues to use the repository's existing legacy-compatible stdio server; native MCP 2026-07-28 remains the separately tracked compatibility gap.
- The concrete work fixture deliberately fails its PKCE verifier until a real Codex Desktop agent implements it.
- No real Codex Desktop execution, proposal, HUMAN approval, governed post-bootstrap mutation, or final V-02 verification was performed in this build.

Next step: follow `CODEX_REAL_RUN.md` with a real Codex Desktop agent and stop at the first explicit human gate.
