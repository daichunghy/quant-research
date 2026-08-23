# Contributing

This repository welcomes focused changes that strengthen the quantitative contract: parsers, compilers, emitters, receipts, JSON Schema, CLI, MCP tools, or tests.

Before opening a pull request:

1. Read `docs/PRODUCT_SPEC.md`, `docs/ARCHITECTURE.md`, `docs/BOUNDARY.md`, and `docs/THREAT_MODEL.md`.
2. Keep compilers free of network access, credentials, model calls, and implicit time.
3. Do not add SEM/PLS estimation, Cronbach’s alpha, or spreadsheet writers.
4. Add regression and negative tests for changed behavior.
5. Run `npm run verify`.

Do not submit generated packages, credentials, respondent-level personal data, or unverifiable claims of SPSS/AMOS/SmartPLS execution.
