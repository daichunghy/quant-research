# Reproducibility guide

This release is a deterministic contract and emitter library. The following sequence reproduces
the committed source and the checked example artifacts without credentials, network calls, a model
provider, or statistical estimation.

## Clean-room run

```sh
git clone --branch v0.1.0-alpha.5 https://github.com/daichunghy/quant-research.git
cd quant-research
npm ci
npm run verify
```

The verification gate covers TypeScript compilation, schema reconciliation, package contents,
secret scanning, and CLI smoke tests. The exact package version resolved by a consumer should be
recorded separately with `npm view @agentbiz/quant-research dist-tags versions --json`.

The distributed [`examples/reproducibility-manifest.json`](../examples/reproducibility-manifest.json)
pins the SHA-256 bytes of every JSON example and the receipt artifact digests produced by the
replay commands recorded in that manifest. The test suite checks both the fixture bytes and those
digests; the package content check also requires the manifest to be present in the published archive.

## Deterministic examples

```sh
node dist/cli.js compile examples/tam-instrument.json
node dist/cli.js compile examples/service-quality-instrument.json
node dist/cli.js codebook examples/tam-instrument.json
node dist/cli.js recode examples/tam-instrument.json examples/tam-dataset.json
node dist/cli.js audit examples/tam-instrument.json examples/tam-dataset.json
node dist/cli.js emit-lavaan examples/tam-bundle.json
node dist/cli.js emit-spss examples/tam-bundle.json
node dist/cli.js csv examples/tam-dataset.json
```

Use the JSON fixtures as demonstration inputs only. The TAM and service-quality items are not
presented as published scales, and the emitted syntax is not a fitted model. A reproducibility
record should include the
release tag, Node.js version, command, exit status, and output artifact hash where the artifact is
retained.

## Evidence boundary

Passing this guide proves that the checked contract and emitters can be rebuilt and replayed from a
clean checkout. It does not prove SEM estimates, fit indices, ethical approval, external users,
package adoption, or a dependent repository. Those claims require separate evidence and must not be
inferred from the local verification result.
