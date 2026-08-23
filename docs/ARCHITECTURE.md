# Architecture

```text
typed JSON intent
        |
        v
 runtime validator (fail closed)
        |
        v
 deterministic compiler
        |
        +-- instrument artifact + dictionary
        +-- topic card
        +-- gap map
        +-- dataset audit
        +-- recode artifact (new columns only)
        +-- measurement spec
        |
        v
 emitters (SPSS / lavaan / AMOS / SmartPLS)
        |
        v
 receipt { inputDigest, artifactDigest, findings, counts }
```

## Source of truth

1. TypeScript types + runtime parser
2. JSON Schema (reconciled in CI)
3. tests
4. examples
5. README / roadmap (never override 1–3)

Canonical JSON matches OpenSheet-AI: sorted object keys, finite numbers only, no `undefined`. It is not RFC 8785.

## Invariants

- Compilers are pure. They do not read the filesystem except via the CLI entrypoint.
- Recode clones rows. The caller’s `Dataset` object is not mutated.
- Closed operation vocabulary. No eval, no engine subprocess, no network.
- Warnings may ride on a successful receipt. Errors throw `ContractValidationError`, except dataset audit, which reports error-severity findings with status `audited`.

## Package surface

Root export: parsers, compilers, emitters, `verifyReceipt`, `SCHEMA`.  
Subpath `./tools`: `TOOL_SCHEMAS` only.

## Later (not this repository’s core)

OpenSheet-AI may compile an instrument dictionary into a `SheetPlan`. That adapter must live in OpenSheet-AI or a future bridge package, not here.
