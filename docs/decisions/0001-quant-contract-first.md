# ADR 0001: Quantitative contract first, engines later

**Status:** accepted  
**Date:** 2026-08-23

## Context

The original AgentBiz-Toolkit pitch mixed B2B CRM schemas, payroll rules, sheet adapters, and a quantitative gold mine. OpenSheet-AI already owns spreadsheet plans. PatchGate and contribkit already occupy the two grant flagships. Shipping four empty npm packages would inflate registry surface without a dependable API.

## Decision

1. Implement **one** package: `@agentbiz/quant-research`.
2. Compilers emit specifications and recode artifacts. They do not run SEM.
3. Keep `private: true` and `0.0.0-dev` until the owner authorizes publication.
4. Do not create stub `@agentbiz/sales-crm` or `finance-hr` packages in this repository.

## Consequences

The first honest dependent repo has to import this contract because it needs instruments/recodes/specs, not because a template fork exists. Sales and finance modules remain future packages with their own ADRs.
