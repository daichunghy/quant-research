# quant-research Agent Verification Map

**Status:** local operating contract
**Authority:** `docs/PRODUCT_SPEC.md`, `docs/ARCHITECTURE.md`,
`docs/BOUNDARY.md`, `docs/THREAT_MODEL.md`, exported contracts, schemas and
tests

quant-research applies the transcript's verification-first workflow to typed
research artifacts. It produces instruments, coverage maps, recodes,
measurement specifications and emitter outputs. It does not run statistics,
write spreadsheets or turn a model's prose into an unvalidated research claim.

## Trust curve

```text
validate typed research input
  -> compile deterministic artifact
  -> verify provenance and contract
  -> inspect recode/audit findings
  -> emit reproducible engine syntax/specification
  -> bounded agent work
  -> external researcher evidence
```

Receipts prove the input and artifact digests under the package contract. They
do not prove ethical approval, construct validity, SEM correctness or an
executed external engine.

## Surface map

| Surface | Start here | Minimum verification | Invariant |
| --- | --- | --- | --- |
| Contract/schema | `src/core/`, `schemas/` | schema, receipt and reconciliation tests | unknown versions fail closed |
| Domain compilers | `src/instrument`, `src/topic-card`, `src/gap-map`, `src/dataset`, `src/recode`, `src/measurement` | module, negative and deterministic tests | typed inputs only; no network or clock |
| Emitters | `src/emit/` | golden emitter tests | emit text/specs; never invoke engines |
| Tools/MCP | `src/tools/`, `src/mcp.ts` | tool, boundary and CLI tests | no `ai` dependency or arbitrary execution |
| Provenance | examples and citation validation | provenance/error tests | `cited` requires `source.citation` |
| Dataset/recode safety | `src/dataset`, `src/recode` | boundary and immutability tests | report issues; add columns; never drop rows |
| Package/release | `package.json`, `scripts/check-pack.mjs` | pack, secrets and smoke checks | public surface matches declared files |

## Verification ladder

```bash
npm run typecheck
npm run test
npm run build
npm run check:schema
npm run check:errors
npm run check:secrets
npm run check:smoke
npm run check:pack
npm run check:agent-contract
npm run verify
npm run agent-eval -- QR-01
```

`first-use` and local quickstarts are local evidence only. They do not prove
external researcher use, engine execution, publication quality or grant
eligibility.

## Non-negotiable PR invariants

- compilers accept validated typed JSON and use no network, credentials,
  model calls, filesystem reads, randomness or implicit time;
- no compiler estimates SEM, fit indices, alpha, AVE, HTMT, p-values or other
  statistical results;
- dataset audits report out-of-bound/missing/duplicate/straight-line findings
  without dropping rows;
- recodes create new columns, preserve nulls and never overwrite source data;
- demonstration items remain labelled `demonstration`; `cited` requires a
  citation;
- emitters produce SPSS/lavaan/AMOS/SmartPLS specifications but never execute
  an engine or claim its output;
- no Excel/Google Sheets write, OpenSheet-AI import, payment or ERP connector
  is added to this package;
- receipts bind exact input and artifact digests but do not claim validation;
- one agent task has one purpose, explicit paths and a reversible diff;
- local CI and package checks are not adoption, production or grant evidence.

## Bounded work

Use two or three independent tasks only when write sets are disjoint. Serialize
core schemas, recode semantics, emitters and package exports. The parent
maintainer inspects each diff, reruns targeted checks, then runs
`npm run verify`. Timeouts and unreviewed agent summaries are not evidence.

## Failure-to-guardrail loop

Convert every recurring failure into a negative fixture, deterministic test,
error reference, secret scan or package check. Prefer an explicit unsupported
result over a silently broader scientific or platform claim.

## Handoff

```text
Scope:
Files changed:
Invariant protected:
Targeted checks:
Aggregate check:
Evidence level:
Known non-claims:
```
