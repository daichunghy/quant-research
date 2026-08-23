import { describe, expect, it } from "vitest";
import { emitCodebookMarkdown, emitDatasetCsv, emitDictionaryCsv, emitSpssDataList } from "../src/emit/index.js";
import { compileGapMap, observedFromDataset } from "../src/gap-map/index.js";
import { handleMcpMessage } from "../src/mcp.js";
import { parseDataset } from "../src/dataset/index.js";
import { compileRecode, recodePlanFromInstrument } from "../src/recode/index.js";
import { executeTool } from "../src/tools/execute.js";
import { loadExample, tamInstrument } from "./helpers.js";

describe("recodePlanFromInstrument", () => {
  it("adds reverse columns, construct means, and a straight-line flag", () => {
    const plan = recodePlanFromInstrument(tamInstrument());
    expect(plan.operations.some((item) => item.kind === "reverse-score" && item.as === "PU3_R")).toBe(true);
    expect(plan.operations.some((item) => item.kind === "construct-score" && item.as === "PU_MEAN")).toBe(true);
    expect(plan.operations.at(-1)?.kind).toBe("flag-straight-line");
    const dataset = parseDataset(loadExample("tam-dataset.json"));
    const compiled = compileRecode(plan, dataset, tamInstrument());
    expect(compiled.artifact.rows[0]?.PU_MEAN).toBeCloseTo((5 + 5 + 1) / 3, 10);
    expect(compiled.artifact.rows[0]?.STRAIGHT).toBe(1);
    expect(dataset.columns.some((column) => column.name === "PU_MEAN")).toBe(false);
  });
});

describe("codebook and csv", () => {
  it("emits markdown, dictionary CSV, dataset CSV, and SPSS DATA LIST", () => {
    const instrument = tamInstrument();
    const markdown = emitCodebookMarkdown(instrument);
    expect(markdown).toContain("PU1");
    expect(markdown).toContain("Demonstration items are not published");
    expect(emitDictionaryCsv(instrument)).toContain("constructCode,constructName,itemCode");
    const dataset = parseDataset(loadExample("tam-dataset.json"));
    expect(emitDatasetCsv(dataset).split("\n")[0]).toContain("PU1");
    expect(emitSpssDataList(dataset)).toContain("BEGIN DATA");
  });

  it("neutralizes spreadsheet formula prefixes in CSV output", () => {
    const csv = emitDatasetCsv({
      schemaVersion: "agentbiz.dataset.v1",
      columns: [{ name: "value", role: "other" }],
      rows: [{ value: "=SUM(A1)" }, { value: "@cmd" }, { value: "safe" }],
      rowCount: 3,
    });
    expect(csv).toContain("'=SUM(A1)");
    expect(csv).toContain("'@cmd");
    expect(csv).toContain("safe");
  });
});

describe("observedFromDataset", () => {
  it("covers the TAM dataset indicators", () => {
    const dataset = parseDataset(loadExample("tam-dataset.json"));
    const compiled = compileGapMap(observedFromDataset(dataset), tamInstrument());
    expect(compiled.artifact.rows.every((row) => row.status === "covered")).toBe(true);
  });
});

describe("executeTool", () => {
  it("validates the TAM instrument", () => {
    const result = executeTool("validate_instrument", { instrument: loadExample("tam-instrument.json") });
    expect(result.ok).toBe(true);
  });

  it("rejects an unknown tool", () => {
    const result = executeTool("fit_sem", { instrument: {} });
    expect(result.ok).toBe(false);
  });
});

describe("MCP", () => {
  it("lists tools and calls validate_instrument", async () => {
    const listed = await handleMcpMessage({ jsonrpc: "2.0", id: 1, method: "tools/list" });
    const tools = (listed as { result: { tools: { name: string }[] } }).result.tools;
    expect(tools.some((tool) => tool.name === "emit_codebook")).toBe(true);
    const called = await handleMcpMessage({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/call",
      params: {
        name: "validate_instrument",
        arguments: { instrument: loadExample("tam-instrument.json") },
      },
    });
    const text = (called as { result: { content: { text: string }[] } }).result.content[0]?.text ?? "";
    expect(text).toContain("compiled");
  });
});
