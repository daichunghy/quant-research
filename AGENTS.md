# AGENTS.md

This repository builds `@agentbiz/quant-research`, a deterministic domain contract for quantitative research instruments, coverage maps, recodes, and measurement specifications.

Read `docs/PRODUCT_SPEC.md`, `docs/ARCHITECTURE.md`, `docs/BOUNDARY.md`, and `docs/THREAT_MODEL.md` before substantive implementation work.

## Non-negotiable boundaries

- Keep compilers deterministic. No network, credentials, model calls, or wall-clock time.
- Treat natural-language interpretation as untrusted. Only validated typed JSON enters a compiler.
- Do not estimate SEM, compute fit indices, Cronbach’s alpha, AVE, HTMT, or p-values.
- Do not drop rows or items to improve a statistic. Audits report; recodes only add columns.
- Do not write Excel or Google Sheets. Do not import `opensheet-ai`.
- Demonstration items stay labelled `demonstration`. `cited` requires `source.citation`.
- Do not claim OSS grant eligibility, downloads, dependents, or OpenSSF criticality.

## Source layout

- `src/core/`: canonical JSON, errors, receipts, shared types
- `src/instrument|topic-card|gap-map|dataset|recode|measurement/`: compilers
- `src/emit/`: SPSS, lavaan, AMOS, SmartPLS text/JSON emitters
- `src/tools/`: JSON Schema tool defs plus `executeTool` (no `ai` dependency)
- `src/mcp.ts`: stdio MCP server
- `skills/quant-research/`: agent skill that points at this repo
- `schemas/`: public JSON Schema contracts
- `examples/`: TAM demonstration fixtures
- `test/`: positive, negative, determinism, schema-reconciliation, CLI, boundary
- `docs/`: product, architecture, boundary, grant honesty, threat model

## Required verification

Run `npm run verify` after meaningful changes.

The repository is a public alpha only after the owner-authorized repository and package publication have been verified. Keep statistical, adoption, grant, and production claims fail-closed until their evidence exists.
