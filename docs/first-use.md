# First use: produce one research artifact

The first useful result is not a fitted model. It is a checked research bundle
that makes the instrument, recodes, coverage, and analysis syntax explicit
before data analysis begins.

## Ten-minute local path

```bash
npm ci
npm run first-use
```

For an installed package, the shortest path is:

```bash
npm install @agentbiz/quant-research@alpha
npx agentbiz-quant-workflow --workflow service-quality --out ./quant-output
```

This uses the workflow script and demonstration inputs shipped in the package;
no source checkout is required.

To run the complete TAM workflow and receive a readable output directory:

```bash
npm run build
node scripts/research-workflow.mjs --out /tmp/quant-research-workflow
```

This creates a codebook, coverage map, dataset audit, recode, measurement
specification, and SPSS/lavaan/AMOS/SmartPLS emissions. The emissions are
specifications only; the workflow also writes `workflow-summary.json` and the
concise newcomer-facing `workflow-summary.md`. It does not run a statistical
engine or delete rows or items.

To run a second complete workflow for service quality and customer experience:

```bash
node scripts/research-workflow.mjs --workflow service-quality --out /tmp/quant-research-service-quality-workflow
```

The entrypoint lists this mode with `node scripts/research-workflow.mjs --help`.
The descriptor form remains supported for replaying or supplying another
workflow JSON. This service-quality example keeps its instrument, topic card,
observed columns, small dataset, recode plan, and measurement input together
in `examples/service-quality-workflow/`; it follows the same audit, recode,
and emitter path as the TAM example.

The outputs should make the following visible:

- construct and item codes with Likert bounds and reverse flags;
- new recode columns without deleting cases or items;
- covered, partial, missing, mismatch, and unexpected indicators;
- declared syntax for lavaan or SPSS without pretending that estimation ran.

The TAM and service-quality inputs are demonstrations, not published scales. This package does not
estimate SEM, compute fit indices, write spreadsheets, call a model provider,
or decide whether a measurement model is valid.

## What to report

Record the package/tag, study context at a non-sensitive level, time to the
first useful artifact, first confusing output, and whether a researcher would
use the result in a real workflow. Use the [first-use feedback form](https://github.com/daichunghy/quant-research/issues/new?template=first-use.md)
without attaching participant data, credentials, or unpublished instruments.

This path proves deterministic local output. It does not prove external users,
ethical approval, statistical validity, or package adoption.

For package release, consumer updates, and rollback, see
[release-and-rollback.md](release-and-rollback.md).
