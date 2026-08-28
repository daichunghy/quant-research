# Agent scaling checkpoint — 2026-08-27

**Evidence level:** local and fixture-verified

The repository now contains a quant-research-specific [verification
map](agent-verification-map.md), [evaluation protocol](agent-evaluation-protocol.md),
machine-readable corpus at `fixtures/agent-evals/manifest.json`, and an
allowlisted `npm run agent-eval -- <QR-task-id>` runner. The contract checker is
part of `npm run verify`.

## Acceptance baseline

All eight manifest tasks passed on the current tree:

```text
QR-01 contract/schema: pass
QR-02 instrument compiler: pass
QR-03 provenance/topic cards: pass
QR-04 gap map/dataset audit: pass
QR-05 recode safety: pass
QR-06 measurement specification: pass
QR-07 emitters/tools: pass
QR-08 CLI/package surface: pass
```

The complete repository verification also passed: 55 tests, schema
reconciliation, error-reference checks, package/secret checks, offline
clean-room consumer smoke and CLI smoke.
The first-use command now runs the complete typed workflow and checks that
rows and raw columns are preserved without executing a statistical engine.
Each run now also writes a deterministic `workflow-summary.md` beside the JSON
summary for quick human review. The checked examples now include both TAM and
service-quality workflow families.

## Limits

This proves reproducible local artifacts only. It does not prove ethical
approval, construct validity, SEM correctness, executed SPSS/lavaan/AMOS/
SmartPLS jobs, external researcher use, grant eligibility or production
adoption. The package still must not drop rows, overwrite source columns,
invoke engines, write spreadsheets or import OpenSheet-AI.

The next useful evidence is a consented external researcher workflow and a
qualified review of any future statistical-engine adapter.
