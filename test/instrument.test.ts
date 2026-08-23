import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ContractValidationError } from "../src/core/errors.js";
import { digestJson } from "../src/core/canonical.js";
import { compileInstrument, parseInstrument } from "../src/instrument/index.js";
import { clone, loadExample } from "./helpers.js";

const source = readFileSync(fileURLToPath(new URL("../src/instrument/index.ts", import.meta.url)), "utf8");

describe("instrument", () => {
  it("compiles the TAM demonstration instrument", () => {
    const compiled = compileInstrument(loadExample("tam-instrument.json"));
    expect(compiled.receipt.status).toBe("compiled");
    expect(compiled.artifact.dictionary).toHaveLength(9);
    expect(compiled.artifact.instrument.constructs.map((item) => item.code)).toEqual(["PU", "PEU", "BI"]);
    expect(compiled.artifact.dictionary.filter((row) => row.reverse).map((row) => row.itemCode)).toEqual([
      "PU3",
      "PEU3",
    ]);
  });

  it("is digest-stable", () => {
    const input = loadExample("tam-instrument.json");
    const first = compileInstrument(input);
    const second = compileInstrument(clone(input));
    expect(first.receipt.artifactDigest).toBe(second.receipt.artifactDigest);
    expect(first.receipt.artifactDigest).toBe(digestJson(first.artifact));
  });

  it("rejects duplicate item codes", () => {
    const input = clone(loadExample("tam-instrument.json")) as {
      constructs: { items: { code: string }[] }[];
    };
    input.constructs[0]!.items[1]!.code = "PU1";
    expect(() => parseInstrument(input)).toThrow(ContractValidationError);
  });

  it("rejects cited items without a citation", () => {
    const input = clone(loadExample("tam-instrument.json")) as {
      constructs: { items: { status: string; source?: { note?: string } }[] }[];
    };
    input.constructs[0]!.items[0]!.status = "cited";
    expect(() => parseInstrument(input)).toThrow(/cited/);
  });

  it("rejects invalid scale bounds", () => {
    const input = clone(loadExample("tam-instrument.json")) as {
      constructs: { scale: { min: number; max: number } }[];
    };
    input.constructs[0]!.scale.min = 3;
    expect(() => parseInstrument(input)).toThrow(ContractValidationError);
  });

  it("rejects unknown top-level fields instead of silently dropping them", () => {
    const input = { ...clone(loadExample("tam-instrument.json")) as Record<string, unknown>, extra: true };
    expect(() => parseInstrument(input)).toThrow(/Unknown field 'extra'/);
  });

  it("warns when item codes do not use the construct prefix", () => {
    const input = clone(loadExample("tam-instrument.json")) as {
      constructs: { items: { code: string }[] }[];
    };
    input.constructs[0]!.items[0]!.code = "USE1";
    const compiled = compileInstrument(input);
    expect(compiled.receipt.findings.some((item) => item.severity === "warning")).toBe(true);
  });

  it("does not implement alpha or SEM fitting", () => {
    expect(source).not.toMatch(/cronbach|bootstrap|fitModel|pvalue/i);
  });
});
