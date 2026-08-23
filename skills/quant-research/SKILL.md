---
name: agentbiz-quant-research
description: >
  Compile quantitative research instruments, coverage maps, recodes, codebooks, and
  SPSS/lavaan/AMOS/SmartPLS specifications with @agentbiz/quant-research. Use when
  the user mentions scale bank, Likert, reverse-key, gap map, topic card, SmartPLS,
  AMOS, lavaan, SPSS syntax, survey recode, construct score, codebook, or AgentBiz
  quant. Use when the user runs /agentbiz-quant-research. Do not run SEM or write Excel.
---

# AgentBiz quant-research

Repo: use the installed `@agentbiz/quant-research` package or set `AGENTBIZ_QUANT_RESEARCH_ROOT` to a local clone. Never assume the maintainer's filesystem path.

Work through the local CLI or `executeTool`. Do not invent Likert bounds, reverse flags, or SEM paths. Do not compute alpha, AVE, HTMT, p-values, or fit indices. Do not drop rows. Demonstration items stay `demonstration`.

## Commands

```bash
cd "${AGENTBIZ_QUANT_RESEARCH_ROOT:-.}"
node dist/cli.js compile examples/tam-instrument.json
node dist/cli.js codebook examples/tam-instrument.json
node dist/cli.js recode examples/tam-instrument.json examples/tam-dataset.json
node dist/cli.js emit-lavaan examples/tam-bundle.json
```

Read `docs/PRODUCT_SPEC.md` and `docs/BOUNDARY.md` before extending contracts.

If the user pastes survey JSON, validate it as `agentbiz.instrument.v1` / `agentbiz.dataset.v1` first. If a field is missing, fail closed rather than guessing a published scale.
