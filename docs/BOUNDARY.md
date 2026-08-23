# Boundary versus the other Github folders

| Folder | Product | Job | This package |
| --- | --- | --- | --- |
| `Desktop/Github` | PatchGate | Review-readiness before a maintainer spends time | No overlap |
| `Desktop/Github 2` | contribkit | Preflight before a PR is *opened* | No overlap |
| `Desktop/Github 3` | OpenSheet-AI | Spreadsheet plan / policy / receipt | Adjacent, not a fork |
| `Desktop/Github 4` | `@agentbiz/quant-research` | Quantitative *domain* contract | This repo |

OpenSheet-AI `compileScaleBank` / `compileGapMap` write workbook ranges. They do not validate reverse keys, emit SPSS, or bind SEM paths. OpenSheet’s product spec forbids implementing SEM in the spreadsheet core.

Github 4 never emits `opensheet.plan.v1`. It never imports `opensheet-ai` or ExcelJS.

Grant flagships stay assigned:

- Codex for OSS → PatchGate
- Claude for OSS → contribkit
- Github 4 is **not** submitted on those forms in this phase
