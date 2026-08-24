# First use: produce one research artifact

The first useful result is not a fitted model. It is a checked research bundle
that makes the instrument, recodes, coverage, and analysis syntax explicit
before data analysis begins.

## Ten-minute local path

```bash
npm ci
npm run build
node dist/cli.js compile examples/tam-instrument.json
node dist/cli.js codebook examples/tam-instrument.json
node dist/cli.js recode examples/tam-instrument.json examples/tam-dataset.json
node dist/cli.js gap examples/tam-instrument.json examples/tam-observed.json
node dist/cli.js emit-lavaan examples/tam-bundle.json
node dist/cli.js emit-spss examples/tam-bundle.json
```

The outputs should make the following visible:

- construct and item codes with Likert bounds and reverse flags;
- new recode columns without deleting cases or items;
- covered, partial, missing, mismatch, and unexpected indicators;
- declared syntax for lavaan or SPSS without pretending that estimation ran.

The TAM items are demonstrations, not published scales. This package does not
estimate SEM, compute fit indices, write spreadsheets, call a model provider,
or decide whether a measurement model is valid.

## What to report

Record the package/tag, study context at a non-sensitive level, time to the
first useful artifact, first confusing output, and whether a researcher would
use the result in a real workflow. Use the [first-use feedback form](https://github.com/daichunghy/quant-research/issues/new?template=first-use.md)
without attaching participant data, credentials, or unpublished instruments.

This path proves deterministic local output. It does not prove external users,
ethical approval, statistical validity, or package adoption.
