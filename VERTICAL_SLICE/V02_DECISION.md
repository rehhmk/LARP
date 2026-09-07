# V-02 Decision — Language → Runtime Vertical Slice

Status: **ACCEPTED / ACTIVE**

Accepted by: HUMAN project owner
Accepted command: `::approve V-02`
Accepted proposal: `VERTICAL_SLICE/V02_PROPOSAL.md`
Proposal commit: `811297d92c2a4b2a0fba3ff2ce61fb14fa814d05`

## Decision

The V-02 roadmap criterion is accepted as proposed:

> **V-02 — Prove the complete LARP language-to-runtime path end to end: a real `*.larp` program compiles to LARP IR, initializes governed semantic state, supplies a real coding agent through MCP, accepts only human-governed mutation, and can replay accepted history to the same final projection.**

The full acceptance contract is the one defined in `VERTICAL_SLICE/V02_PROPOSAL.md`, including source→IR determinism, governed seed bootstrap, real-agent execution, human-gated mutation, source/history authority separation, replay/reproducibility, and failure conditions.

## Governance effect

- V-02 moves from PROPOSED to ACTIVE.
- This approval does **not** mark V-02 VERIFIED.
- Verified criteria remain `22 / 25`.
- Verified coverage remains `88 / 100`.
- M6 Functional Vertical Slice remains ACTIVE.
- Next execution unit: build V-02 implementation/harness and evidence protocol.

## Evidence requirement

V-02 may only move to VERIFIED after executable evidence is committed and independently checked against the accepted contract. Chat claims or local-only output are insufficient.
