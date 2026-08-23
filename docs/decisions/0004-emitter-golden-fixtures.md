# Decision 0004: emitter golden fixtures

**Status:** implemented
**Date:** 24 August 2026
**Scope:** issue #11

The four bundle-level measurement emitters named by issue #11 now have committed expected
fixtures under `test/fixtures/emitter-golden/expected/`. The test compiles the existing
`examples/tam-bundle.json` input, compares exact text or CLI-style pretty JSON output, and invokes
each emitter twice so nondeterministic output fails before the fixture comparison. Vitest reports
the changed string/object serialization as a diff.

This gate covers `emitSpssSyntax`, `emitLavaanSyntax`, `emitAmosSpec`, and `emitSmartPlsMap`.
The related utility emitters (`emitCodebookMarkdown`, dictionary CSV, dataset CSV, and SPSS DATA
LIST) remain covered by their existing behavior tests and are outside this issue's golden fixture
set; extending the set to those independent output formats is a separate scope.

The TAM input and all four fixtures remain demonstration/specification artifacts. They do not add
provenance, publication, adoption, execution, or statistical-result claims.
