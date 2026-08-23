import { readFile } from "node:fs/promises";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";
import { compileInstrument } from "../src/instrument/index.js";
import { compileTopicCard } from "../src/topic-card/index.js";
import { compileMeasurement } from "../src/measurement/index.js";
import { loadExample, tamInstrument } from "./helpers.js";

type ValidateFn = ((value: unknown) => boolean) & { errors: unknown };

async function loadSchema(name: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(new URL(`../schemas/${name}`, import.meta.url), "utf8")) as Record<
    string,
    unknown
  >;
}

function createAjv() {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  return ajv;
}

describe("schema reconciliation", () => {
  it("compiles every public JSON Schema", async () => {
    const ajv = createAjv();
    for (const name of [
      "instrument.v1.schema.json",
      "topic-card.v1.schema.json",
      "gap-map.v1.schema.json",
      "dataset.v1.schema.json",
      "recode.v1.schema.json",
      "measurement.v1.schema.json",
      "receipt.v1.schema.json",
    ]) {
      ajv.compile(await loadSchema(name));
    }
  });

  it("accepts example documents and compiled receipts", async () => {
    const ajv = createAjv();
    const instrumentSchema = ajv.compile(await loadSchema("instrument.v1.schema.json")) as ValidateFn;
    const topicSchema = ajv.compile(await loadSchema("topic-card.v1.schema.json")) as ValidateFn;
    const gapSchema = ajv.compile(await loadSchema("gap-map.v1.schema.json")) as ValidateFn;
    const datasetSchema = ajv.compile(await loadSchema("dataset.v1.schema.json")) as ValidateFn;
    const recodeSchema = ajv.compile(await loadSchema("recode.v1.schema.json")) as ValidateFn;
    const measurementSchema = ajv.compile(await loadSchema("measurement.v1.schema.json")) as ValidateFn;
    const receiptSchema = ajv.compile(await loadSchema("receipt.v1.schema.json")) as ValidateFn;

    expect(instrumentSchema(loadExample("tam-instrument.json"))).toBe(true);
    expect(topicSchema(loadExample("tam-topic-card.json"))).toBe(true);
    expect(gapSchema(loadExample("tam-observed.json"))).toBe(true);
    expect(datasetSchema(loadExample("tam-dataset.json"))).toBe(true);
    expect(recodeSchema(loadExample("tam-recode.json"))).toBe(true);
    expect(measurementSchema(loadExample("tam-measurement.json"))).toBe(true);

    const compiled = compileInstrument(loadExample("tam-instrument.json"));
    expect(receiptSchema(compiled.receipt)).toBe(true);
    const topic = compileTopicCard(loadExample("tam-topic-card.json"), tamInstrument());
    expect(receiptSchema(topic.receipt)).toBe(true);
    const measurement = compileMeasurement(loadExample("tam-measurement.json"), tamInstrument(), topic.artifact);
    expect(receiptSchema(measurement.receipt)).toBe(true);
    expect(measurementSchema(measurement.artifact), JSON.stringify(measurementSchema.errors)).toBe(true);
  });
});
