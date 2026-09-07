# V-02 Evidence Boundary

Status: **LOCAL IMPLEMENTATION EVIDENCE ONLY — REAL AGENT EXECUTION PENDING**

The committed local build proves the deterministic path through compilation, governed seed materialization, projection, ContextBundle compilation, MCP compatibility, and replay. It does not contain or imply a real Codex proposal, HUMAN approval, or post-approval semantic mutation.

Generated local runtime artifacts live under `../run/`:

- `project.json` is a disposable projection rebuilt from `semantic_events.jsonl`;
- `context-bundle.json` and `context-verification.json` are derived from that projection;
- `.larp/runtime/semantic_events.jsonl` is the accepted seed history;
- `.larp/runtime/seed_validation_receipts.jsonl`, `seed_transactions.jsonl`, and `seed_registry.jsonl` record the explicit bootstrap boundary.

The only declarative semantic source is `../source/project.larp`. There is deliberately no semantic project JSON under `fixture/`. Run `npm run reset:real` to delete and regenerate the runtime projection from source → IR → bootstrap → events → projection.

Later real-agent evidence must be captured in a new run-specific subdirectory without editing or synthesizing HUMAN approval. Follow `../CODEX_REAL_RUN.md` and stop at its first human gate.
