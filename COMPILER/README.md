# LARP Context Compiler v0.1

Executable reference implementation for roadmap criteria C-03 and C-04.

## What it implements

- deterministic, read-only `compileContext(...)`
- typed `ContextBundle` sections
- scope-aware semantic selection
- relation-driven dependency closure
- preservation of Unknown / Assumption / Evidence / Decision distinctions
- supersession visibility without silently rewriting dependencies
- dependency manifest with watched dimensions
- SHA-256 input and bundle fingerprints over canonical JSON
- `verifyContext(...)` returning CURRENT / STALE_NON_BLOCKING / STALE_BLOCKING
- structural relation and scope dependencies in drift checks
- deterministic selection and omission traces

## Run

```bash
npm test
```

No external npm dependencies are required.
