# @agentbiz/quant-research

`@agentbiz/quant-research` turns a declared research instrument into a checked codebook, recode artifact, coverage result, and analysis specification before anyone opens SPSS, AMOS, SmartPLS, or lavaan.

Large language models do not reliably keep Likert bounds, reverse-keyed items, construct codes, or SEM path lists consistent. This library is the typed contract those agents should call **before** anyone opens SPSS, AMOS, SmartPLS, or lavaan.

It compiles JSON in and emits dictionaries, coverage maps, recode artifacts, SPSS syntax, lavaan specs, AMOS path lists, and SmartPLS indicator maps. It does **not** estimate models, compute fit indices, write Excel or Google Sheets, or call a model provider.

**Live status (2026-08-24):** public alpha (`0.1.0-alpha.5` on GitHub, 0 stars, 0 forks). No external user, downstream repository, or pilot is verified. npm `alpha` resolves `0.1.0-alpha.5` while `latest` remains `0.1.0-alpha.4`. This release is a deterministic contract and emitter library. It does not estimate SEM, compute fit indices, write Excel or Google Sheets, call a model provider, or claim adoption, downloads, or dependent repositories.

> If it caught one inconsistent recode before analysis,
> [star it](https://github.com/daichunghy/quant-research/stargazers). That is
> the only growth signal this repo tracks.

## Install from npm

Install the public alpha from the npm registry:

```bash
npm install @agentbiz/quant-research@alpha
```

The package targets Node.js 20 and 22. Use the GitHub repository for release
notes, boundary documents, examples, and issue reporting.

## Verify from source

To reproduce the committed release locally, use the verified GitHub tag:

```bash
git clone --branch v0.1.0-alpha.5 https://github.com/daichunghy/quant-research.git
cd quant-research
npm ci
npm run verify
```

Support and first-run questions: [`.github/SUPPORT.md`](.github/SUPPORT.md) or [GitHub Discussions](https://github.com/daichunghy/quant-research/discussions).

This is Github 4. It is not PatchGate, contribkit, or OpenSheet-AI. See [docs/BOUNDARY.md](docs/BOUNDARY.md).
For citation and clean-room reproduction, see [`CITATION.cff`](CITATION.cff) and
[`docs/REPRODUCIBILITY.md`](docs/REPRODUCIBILITY.md).

The shortest route to a concrete artifact is the [first-use walkthrough](docs/first-use.md).

## Install (local)

```bash
npm install
npm run verify
```

```bash
node dist/cli.js compile examples/tam-instrument.json
node dist/cli.js compile examples/service-quality-instrument.json
node dist/cli.js codebook examples/tam-instrument.json
node dist/cli.js recode examples/tam-instrument.json examples/tam-dataset.json
node dist/cli.js gap examples/tam-instrument.json examples/tam-observed.json
node dist/cli.js audit examples/tam-instrument.json examples/tam-dataset.json
node dist/cli.js emit-lavaan examples/tam-bundle.json
node dist/cli.js emit-spss examples/tam-bundle.json
node dist/cli.js csv examples/tam-dataset.json
```

MCP stdio: `node dist/mcp.js` (`agentbiz-quant-mcp`). Tools are executable through `executeTool`, not documentation-only.

Agent skill: copy `skills/quant-research/SKILL.md` into the target agent's skill directory, or use the installed package with `AGENTBIZ_QUANT_RESEARCH_ROOT` pointing at a clone. The skill is portable and does not assume the maintainer's filesystem path.

## Library

```ts
import {
  compileInstrument,
  compileTopicCard,
  compileMeasurement,
  emitLavaanSyntax,
} from "@agentbiz/quant-research";

const instrument = compileInstrument(instrumentJson);
const topicCard = compileTopicCard(topicCardJson, instrument.artifact.instrument);
const measurement = compileMeasurement(measurementJson, instrument.artifact.instrument, topicCard.artifact);

const syntax = emitLavaanSyntax({
  instrument: instrument.artifact.instrument,
  topicCard: topicCard.artifact,
  measurement: measurement.artifact,
});
```

Agent tool JSON Schemas live on `@agentbiz/quant-research/tools`. They describe functions. They do not call Vercel, OpenAI, or Anthropic.

## What v1 covers

| Contract | Job |
| --- | --- |
| `agentbiz.instrument.v1` | Scale bank with reverse flags, Likert bounds, demonstration vs cited provenance |
| `agentbiz.topic-card.v1` | Question, claim class, hypotheses bound to instrument codes |
| `agentbiz.gap-map.v1` | Coverage: covered / partial / missing / mismatch / unexpected |
| `agentbiz.dataset.v1` | Tabular snapshot audit: bounds, missing, duplicates, straight-lining (**report only**) |
| `agentbiz.recode.v1` | New columns only: reverse-score, missing sentinels, straight-line flag |
| `agentbiz.measurement.v1` | Declared CB-SEM / PLS-SEM / reliability spec |
| emitters | SPSS syntax, lavaan text, AMOS JSON paths, SmartPLS indicator map |

The TAM and service-quality example items are **demonstration items**. They are not published scales.

## Non-goals

- Cronbach’s alpha, AVE, HTMT, EFA, CFA, SEM, PLS, p-values, or bootstrap
- Deleting items or cases to chase a threshold
- `.xlsx` / Google Sheets writes (that is OpenSheet-AI)
- Model calls or a Claude/Codex plugin in this package
- Empty `@agentbiz/sales-crm` / `finance-hr` packages

The alpha is locally verified by `npm run verify`, including schema reconciliation, package-content checks, secret scanning, and CLI smoke tests. Local verification is not evidence of external users, registry adoption, ethical approval, or correctly specified research.

## Who this is for

- Survey researchers and students whose instruments go into SPSS, lavaan, AMOS,
  or SmartPLS and need bounds, reverse-keyed items, and coverage checked before
  analysis.
- Research assistants who maintain scale banks and codebooks across survey
  waves.
- Agent builders who need a typed contract layer under a research copilot.
- Not a fit if you want fit indices, estimation, or item deletion — see
  Non-goals.

If it caught one inconsistent recode for you, star the repository. It helps
other researchers find the contracts.

Release history: [CHANGELOG.md](CHANGELOG.md).

## License

Apache-2.0. See [LICENSE](LICENSE).
