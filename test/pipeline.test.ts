import { describe, expect, it } from "vitest";
import { ContractValidationError } from "../src/core/errors.js";
import { digestJson } from "../src/core/canonical.js";
import { verifyReceipt } from "../src/core/receipt.js";
import { auditDataset, parseDataset } from "../src/dataset/index.js";
import { emitAmosSpec, emitLavaanSyntax, emitSmartPlsMap, emitSpssSyntax } from "../src/emit/index.js";
import { compileGapMap } from "../src/gap-map/index.js";
import { compileMeasurement } from "../src/measurement/index.js";
import { compileInstrument } from "../src/instrument/index.js";
import { compileRecode } from "../src/recode/index.js";
import { compileTopicCard } from "../src/topic-card/index.js";
import { clone, loadExample, tamInstrument } from "./helpers.js";

describe("topic card", () => {
  it("binds hypotheses to instrument constructs", () => {
    const compiled = compileTopicCard(loadExample("tam-topic-card.json"), tamInstrument());
    expect(compiled.artifact.hypotheses).toHaveLength(3);
    expect(compiled.receipt.counts.hypotheses).toBe(3);
  });

  it("rejects orphan hypotheses", () => {
    const input = clone(loadExample("tam-topic-card.json")) as {
      hypotheses: { from: string }[];
    };
    input.hypotheses[0]!.from = "TRUST";
    expect(() => compileTopicCard(input, tamInstrument())).toThrow(ContractValidationError);
  });
});

describe("gap map", () => {
  it("marks the TAM observed columns as covered", () => {
    const compiled = compileGapMap(loadExample("tam-observed.json"), tamInstrument());
    expect(compiled.artifact.rows.every((row) => row.status === "covered")).toBe(true);
    expect(compiled.artifact.unexpected).toHaveLength(0);
  });

  it("classifies missing, partial, mismatch, and unexpected", () => {
    const compiled = compileGapMap(
      {
        schemaVersion: "agentbiz.gap-map.v1",
        observed: [
          { column: "PU1", itemCode: "PU1", reverse: false },
          { column: "PU3", itemCode: "PU3", reverse: false },
          { column: "X1", itemCode: "FAKE1" },
        ],
      },
      tamInstrument(),
    );
    const byCode = Object.fromEntries(compiled.artifact.rows.map((row) => [row.constructCode, row.status]));
    expect(byCode.PU).toBe("mismatch");
    expect(byCode.PEU).toBe("missing");
    expect(byCode.BI).toBe("missing");
    expect(compiled.artifact.rows.find((row) => row.constructCode === "PU")?.status === "partial" || byCode.PU === "mismatch").toBe(
      true,
    );
    expect(compiled.artifact.unexpected.some((item) => item.itemCode === "FAKE1")).toBe(true);
  });
});

describe("dataset audit", () => {
  it("reports straight-line, out-of-bound, and missing cells without dropping rows", () => {
    const input = loadExample("tam-dataset.json");
    const compiled = auditDataset(input, tamInstrument());
    expect(compiled.receipt.status).toBe("audited");
    expect(compiled.artifact.dataset.rowCount).toBe(12);
    expect(compiled.receipt.counts.straightLineRows).toBe(1);
    expect(compiled.receipt.counts.outOfBoundCells).toBe(1);
    expect((compiled.receipt.counts.missingCells ?? 0) >= 1).toBe(true);
    expect(compiled.artifact.dataset.rows).toHaveLength(12);
  });

  it("rejects rowCount mismatches", () => {
    const input = clone(loadExample("tam-dataset.json")) as { rowCount: number };
    input.rowCount = 3;
    expect(() => auditDataset(input, tamInstrument())).toThrow(/rowCount/);
  });
});

describe("recode", () => {
  it("creates reversed columns and leaves the raw dataset unchanged", () => {
    const instrument = tamInstrument();
    const datasetInput = loadExample("tam-dataset.json");
    const dataset = parseDataset(datasetInput);
    const snapshot = JSON.stringify(dataset.rows);
    const compiled = compileRecode(loadExample("tam-recode.json"), dataset, instrument);
    expect(compiled.artifact.columns.some((column) => column.name === "PU3_R")).toBe(true);
    expect(compiled.artifact.rows[0]?.STRAIGHT).toBe(1);
    expect(compiled.artifact.rows[0]?.PU3_R).toBe(1);
    expect(JSON.stringify(dataset.rows)).toBe(snapshot);
    expect(dataset.columns.some((column) => column.name === "PU3_R")).toBe(false);
  });

  it("refuses to overwrite existing columns", () => {
    const dataset = parseDataset(loadExample("tam-dataset.json"));
    expect(() =>
      compileRecode(
        {
          schemaVersion: "agentbiz.recode.v1",
          operations: [{ kind: "copy-as", from: "PU1", as: "PU2" }],
        },
        dataset,
        tamInstrument(),
      ),
    ).toThrow(/already exists/);
  });
});

describe("measurement and emitters", () => {
  it("compiles a CB-SEM spec and emits syntax without fitting", () => {
    const instrument = tamInstrument();
    const topicCard = compileTopicCard(loadExample("tam-topic-card.json"), instrument).artifact;
    const measurement = compileMeasurement(loadExample("tam-measurement.json"), instrument, topicCard);
    expect(measurement.artifact.paths).toHaveLength(3);
    const bundle = { instrument, topicCard, measurement: measurement.artifact };
    const spss = emitSpssSyntax(bundle);
    expect(spss).toContain("RELIABILITY");
    expect(spss).toContain("RECODE PU3");
    expect(spss).toContain("INTO PU3_R");
    expect(spss).not.toMatch(/\bBOOTSTRAP\b/);
    const lavaan = emitLavaanSyntax(bundle);
    expect(lavaan).toContain("PU =~ PU1 + PU2 + PU3");
    expect(lavaan).toContain("BI ~ PU");
    expect(lavaan).toContain("not a fitted model");
    const amos = emitAmosSpec(bundle);
    expect(amos.paths.some((path) => path.type === "load")).toBe(true);
    expect(amos.paths.some((path) => path.type === "regress" && path.from === "PU" && path.to === "BI")).toBe(true);
    const pls = emitSmartPlsMap(bundle);
    expect(pls.indicators.every((row) => row.mode === "A")).toBe(true);
    expect(pls.inner).toHaveLength(3);
  });

  it("errors in strict mode when a construct is below the heuristic item floor", () => {
    const instrument = tamInstrument();
    const thinInstrument = {
      ...instrument,
      constructs: instrument.constructs.map((construct) =>
        construct.code === "BI" ? { ...construct, items: construct.items.slice(0, 2) } : construct,
      ),
    };
    const topicCard = compileTopicCard(loadExample("tam-topic-card.json"), thinInstrument).artifact;
    expect(() =>
      compileMeasurement(
        { schemaVersion: "agentbiz.measurement.v1", mode: "cb-sem", strict: true },
        thinInstrument,
        topicCard,
      ),
    ).toThrow(ContractValidationError);
  });
});

describe("receipts", () => {
  it("verifies a compiled instrument receipt", () => {
    const input = loadExample("tam-instrument.json");
    const result = compileInstrument(input);
    const verified = verifyReceipt({
      receipt: result.receipt,
      artifact: result.artifact,
      input,
    });
    expect(verified.status).toBe("pass");
    expect(result.receipt.inputDigest).toBe(digestJson(input));
  });

  it("rejects malformed receipt structure before digest checks", () => {
    const input = loadExample("tam-instrument.json");
    const result = compileInstrument(input);
    const malformed = {
      ...result.receipt,
      status: "pass",
      findings: "not-an-array",
      counts: null,
      compiler: {},
    };
    const verified = verifyReceipt({ receipt: malformed, artifact: result.artifact, input });
    expect(verified.status).toBe("fail");
    expect(verified.findings.some((item) => item.path === "status")).toBe(true);
    expect(verified.findings.some((item) => item.path === "findings")).toBe(true);
    expect(verified.findings.some((item) => item.path === "counts")).toBe(true);
  });
});
