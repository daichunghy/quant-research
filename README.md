# @agentbiz/quant-research

`@agentbiz/quant-research` turns a declared research instrument into a checked codebook, recode artifact, coverage result, and analysis specification before anyone opens SPSS, AMOS, SmartPLS, or lavaan.

Large language models do not reliably keep Likert bounds, reverse-keyed items, construct codes, or SEM path lists consistent. This library is the typed contract those agents should call **before** anyone opens SPSS, AMOS, SmartPLS, or lavaan.

It compiles JSON in and emits dictionaries, coverage maps, recode artifacts, SPSS syntax, lavaan specs, AMOS path lists, and SmartPLS indicator maps. It does **not** estimate models, compute fit indices, write Excel or Google Sheets, or call a model provider.

**Live status (2026-08-28):** alpha.6 is prepared locally but not yet published; the public GitHub and npm alpha remain alpha.5, with `latest` at alpha.4. No external user, downstream repository, or pilot is verified. This release is a deterministic contract and emitter library. It does not estimate SEM, compute fit indices, write Excel or Google Sheets, call a model provider, or claim adoption, downloads, or dependent repositories.

> If it caught one inconsistent recode before analysis,
> [star it](https://github.com/daichunghy/quant-research/stargazers). That is
> the only growth signal this repo tracks.

## Install from npm

Install the public alpha from the npm registry:

```bash
npm install @agentbiz/quant-research@alpha
```

After the prepared alpha.6 package is published, run the complete packaged
workflow without cloning the repository:

```bash
npm install --save-exact @agentbiz/quant-research@0.1.0-alpha.6
npx agentbiz-quant-workflow --workflow service-quality --out ./quant-output
```

Then run the complete packaged workflow without cloning the repository:

```bash
npx agentbiz-quant-workflow --workflow service-quality --out ./quant-output
```

The command writes a reproducible bundle with a human-readable
`workflow-summary.md`; it preserves rows and raw columns and reports that no
statistical engine executed.

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

Run the complete service-quality example through the named local workflow mode:

```bash
node scripts/research-workflow.mjs --workflow service-quality --out /tmp/quant-research-service-quality-workflow
```

Use `node scripts/research-workflow.mjs --help` to see the named modes and the
descriptor form. The output directory includes a human-readable
`workflow-summary.md` and machine-readable JSON summary. The workflow emits
specifications only; its summary reports row/raw-column preservation and
`statistical engine executed: false`.

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

Agent-assisted changes follow the [verification map](docs/agent-verification-map.md) and [evaluation protocol](docs/agent-evaluation-protocol.md). Run `npm run agent-eval -- QR-01` for a manifest-backed local acceptance task.

The current local evidence is recorded in the [agent scaling checkpoint](docs/agent-scaling-checkpoint.md).

## License

Apache-2.0. See [LICENSE](LICENSE).
