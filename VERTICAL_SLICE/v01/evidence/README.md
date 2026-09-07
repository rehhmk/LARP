# V-01 real-run evidence

This directory stores committed evidence from the real Codex Desktop V-01 execution.

`run/` is disposable local runtime state and is intentionally ignored. Before final verification, the coding agent must copy the required immutable receipts/snapshots from `run/` into a run-specific directory here, alongside the external-agent transcript/evidence and concrete work diff.

A V-01 run is not VERIFIED merely because files exist here; the complete evidence must satisfy `../V01_FUNCTIONAL_VERTICAL_SLICE_PROTOCOL.md` and be independently checked against GitHub.
