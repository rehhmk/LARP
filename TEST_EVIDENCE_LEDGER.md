# LARP — Test Evidence Ledger

Status: ACTIVE
Repository: `rehhmk/LARP`
Authoritative branch for current test evidence: `main`
Policy: `TESTING_SOURCE_OF_TRUTH.md`

## A-01 — Real coding-agent MCP adapter verification

**Status: VERIFIED**

Verification basis:

- Evidence commit: `c630a01363593eb78b1931abfa3ca527d25ee699`
- External agent evidence: `ADAPTER/A01_EXTERNAL_AGENT_EVIDENCE.md`
- Runtime proposal receipt: `ADAPTER/.larp/runtime/proposals.jsonl`
- Project fixture: `ADAPTER/examples/project.json`
- Adapter tests/report: `ADAPTER/TEST_OUTPUT.txt`, `ADAPTER/TEST_REPORT.md`

Independent verification performed by ChatGPT against GitHub `main`:

- Codex Desktop identified as real coding-agent host.
- Live MCP client identified as `codex-mcp-client` version `0.145.0-alpha.18`.
- Required calls present in order: `larp_status`, `larp_get_context`, `larp_verify_context`, `larp_propose`.
- `larp_status.projectId = demo`.
- `larp_status.semanticMutationAllowed = false`.
- Context contains `decision:auth` and `unknown:refresh-policy`.
- Context verification returns `CURRENT`, severity `NONE`, no changes.
- Proposal receipt returns `status = PROPOSED`, `semanticMutationApplied = false`, `governanceRequired = true`.
- `ADAPTER/.larp/runtime/proposals.jsonl` contains exactly the reported proposal receipt.
- Runtime evidence directory contains `proposals.jsonl` and no `semantic_events.jsonl`.
- SHA-256 independently recomputed for committed `ADAPTER/examples/project.json` equals `b3c428b59e3d8daaa6084522222988d653dd730a4b25c8d5171a362ce36974ce`, matching the external-agent evidence.

Result: **PASS / VERIFIED**.

Roadmap effect (per existing technical baseline): A-01 moves verified criteria from 19/25 to 20/25, i.e. verified coverage from 76/100 to 80/100. The roadmap/progress ledger itself remains governed by the Google Drive authority boundary documented in `TESTING_SOURCE_OF_TRUTH.md`.
