# Product specification — `@agentbiz/quant-research`

**Version:** 0.1 draft  
**Date:** 23 August 2026  
**Status:** approved for foundation implementation  
**Proof level:** local static and runtime proof only

## 1. Decision

`@agentbiz/quant-research` is a provider-neutral contract layer for quantitative research work that coding agents keep re-implementing badly: Likert instruments, reverse keys, construct coverage, recodes, and measurement-model specifications.

The reusable unit is a versioned JSON document plus a deterministic compiler and a SHA-256 receipt. Statistical engines and spreadsheet writers sit outside the package.

## 2. Problem

Agents filling SPSS syntax, SmartPLS maps, or survey codebooks from prose routinely:

- invent Likert bounds;
- forget reverse-keyed items;
- map the wrong column to a construct;
- drop cases after seeing alpha;
- emit path diagrams that do not match the stated hypotheses.

Developers currently copy ad-hoc schemas into each EduTech or thesis-helper project.

## 3. Thesis

Developers will depend on this package if it lets an agent (or a CLI) produce the same instrument dictionary, coverage map, recode log, and engine specification every time, with machine-readable failures, without running statistics.

## 4. Users

- authors of research-agent tools and EduTech apps;
- MCP/tool authors who need a typed quantitative intent;
- students and research developers who need SPSS/lavaan/SmartPLS *specifications*, not p-values from a chatbot;
- OpenSheet-AI callers who may later present these artifacts as sheets.

## 5. Functional requirements

- FR-001: `agentbiz.instrument.v1` with unique codes, Likert min∈{1,2} max∈{5,7}, reverse flags, demonstration|cited provenance.
- FR-002: `cited` items require `source.citation`.
- FR-003: Topic cards bind hypotheses to instrument construct codes.
- FR-004: Gap maps classify covered, partial, missing, mismatch, unexpected.
- FR-005: Dataset audit reports out-of-bound, missing, duplicate ids, straight-lining; does not drop rows.
- FR-006: Recode operations only create new columns; reverse-score is min+max−x; null stays null.
- FR-007: Measurement specs declare cb-sem | pls-sem | reliability-only. Under-identification is a warning unless `strict`.
- FR-008: Emitters produce SPSS syntax, lavaan text, AMOS JSON paths, SmartPLS indicator maps. They do not execute engines.
- FR-009: Every successful compile/audit returns `agentbiz.receipt.v1` with input and artifact digests.
- FR-010: CLI covers compile, gap, audit, recode, emit-*, verify-receipt.
- FR-011: `@agentbiz/quant-research/tools` exports JSON Schema tool defs without depending on the `ai` package.

## 6. Non-functional requirements

- Node.js 20 and 22. Zero production dependencies.
- Canonical JSON + SHA-256; no implicit timestamps or randomness.
- Runtime validator is fail-closed. Ajv is test/CI only.
- Public schemas follow semantic versioning after the first public prerelease.

## 7. Non-goals

Natural-language parsing; model APIs; Excel/Sheets I/O; SEM mathematics; Cronbach’s alpha; dropping items for thresholds; sales-crm/finance-hr packages; grant-eligibility claims. The stdio MCP server exposes the package's deterministic tools but does not add statistical or spreadsheet execution.

## 8. Success (product, not grant)

- `npm run verify` passes.
- Five external developers completing the local quick start (future).
- One independent consumer importing the contract (future).
- No fabricated downloads or dependents.

Grant thresholds are not product acceptance criteria. See `docs/GRANT_PATH.md`.
