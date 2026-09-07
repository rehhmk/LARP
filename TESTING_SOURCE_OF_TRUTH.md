# LARP — Testing Source of Truth

Status: ACTIVE

## Authority boundary

GitHub repository `rehhmk/LARP`, default branch `main`, is the shared source of truth for **executable test evidence** used by ChatGPT and Codex.

This does **not** replace the existing Google Drive authority for product/technical specifications, roadmap state, accepted human gates, or the progress ledger.

```text
Google Drive
  -> specs, roadmap, accepted decisions, progress ledger

GitHub main
  -> executable code, fixtures, test outputs, external-agent evidence, verification artifacts
```

## Verification rule

A test criterion may be marked VERIFIED only when its required evidence is present on GitHub `main` (or an explicitly referenced immutable commit SHA) and can be independently inspected.

Chat transcripts, local files, screenshots, or agent claims are supporting material only until the corresponding evidence is committed.

## Required evidence shape

For each executable criterion, prefer:

- implementation or harness
- deterministic fixture(s)
- raw/near-raw test output
- human-readable test report
- external-agent transcript/receipt when the criterion requires a real agent host
- runtime evidence relevant to the gate
- immutable Git commit SHA
- artifact SHA-256 when a packaged artifact exists

## Runtime evidence boundary

Committed `.larp/runtime/*` files are **test evidence fixtures/receipts**, not the canonical runtime state of any production LARP project.

Semantic truth remains governed by the LARP semantic-state architecture; committing a runtime receipt to Git does not grant it semantic authority.

## Agent protocol

Before verifying an executable criterion, both ChatGPT and Codex should:

1. identify the repository and default branch;
2. inspect the relevant evidence on GitHub;
3. record the commit SHA used for verification;
4. verify the criterion against committed evidence rather than relying on conversation memory;
5. update the test evidence ledger when the criterion is accepted.

## A-01 anchor

Initial external-agent evidence is committed at:

- `ADAPTER/A01_EXTERNAL_AGENT_EVIDENCE.md`
- `ADAPTER/.larp/runtime/proposals.jsonl`
- `ADAPTER/examples/project.json`

The initial evidence repository commit is `c630a01363593eb78b1931abfa3ca527d25ee699`.
