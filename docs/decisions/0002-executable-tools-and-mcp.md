# ADR 0002: Executable tools, MCP, construct scores

**Status:** accepted  
**Date:** 2026-08-23

## Context

The foundation shipped JSON Schema tool *descriptions* that agents could not actually call. Recodes could reverse items but not compute construct means. There was no codebook, CSV, MCP server, or local skill, so the library was not installed into the agent loop.

## Decision

1. `executeTool(name, args)` is the single dispatcher behind CLI helpers, tests, and MCP.
2. Ship a stdio MCP server (`agentbiz-quant-mcp`) with no extra production dependency.
3. Add `construct-score` and `recodePlanFromInstrument` (reverse + mean + straight-line flag). Means use pairwise available items and never drop rows.
4. Emit markdown codebook, dictionary CSV, dataset CSV, and SPSS DATA LIST text. Still no `.xlsx`.
5. Install a user-scope skill that points at this repository.

Sales-crm and finance-hr remain out of this package (ADR 0001).
