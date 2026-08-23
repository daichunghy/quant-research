# ADR 0003: Owner-authorized public alpha

**Status:** accepted  
**Date:** 23 August 2026

## Context

The earlier contract-first decision kept this repository private to avoid shipping empty packages or implying grant impact. The owner has now asked for the four Desktop projects to be completed and published clearly. The current tree is a real quantitative contract library with deterministic emitters and a passing local verification suite.

## Decision

Publish a narrow public alpha:

- GitHub repository: `daichunghy/quant-research`;
- npm package: `@agentbiz/quant-research@0.1.0-alpha.4`, only if the `@agentbiz` namespace is writable and npm OTP verification is completed by the authenticated account;
- public claims remain limited to typed instrument, coverage, dataset, recode, measurement-spec, receipt, and emitter contracts;
- SEM estimation, fit indices, reliability statistics, spreadsheet writes, ethical approval, grant eligibility, and adoption remain outside the release claim.

## Evidence gate

Before publication, run `npm run verify` and confirm that the committed tree, GitHub default branch, release tag, and npm tarball contain the same version. If npm namespace ownership blocks publication, publish the GitHub repository and release, document the registry blocker, and do not invent a substitute package name.
