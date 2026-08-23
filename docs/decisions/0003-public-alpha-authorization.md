# ADR 0003: Owner-authorized public alpha

**Status:** accepted  
**Date:** 23 August 2026

## Context

The earlier contract-first decision kept this repository private to avoid shipping empty packages or implying grant impact. The owner has now asked for the four Desktop projects to be completed and published clearly. The current tree is a real quantitative contract library with deterministic emitters and a passing local verification suite.

## Decision

Publish a narrow public alpha:

- GitHub repository: `daichunghy/quant-research`;
- npm package: `@agentbiz/quant-research@0.1.0-alpha.5`, published under the writable `@agentbiz` namespace after authenticated npm verification;
- public claims remain limited to typed instrument, coverage, dataset, recode, measurement-spec, receipt, and emitter contracts;
- SEM estimation, fit indices, reliability statistics, spreadsheet writes, ethical approval, grant eligibility, and adoption remain outside the release claim.

## Evidence gate

Publication evidence: `npm run verify` passes, `main` and `v0.1.0-alpha.5` are public, and a clean consumer install resolves the npm alpha. Consumer dependency warnings remain separate from the package identity and adoption claims.
