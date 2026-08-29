import { describe, expect, it } from "vitest";
import { auditDataset, parseDataset } from "../src/dataset/index.js";
import { compileGapMap } from "../src/gap-map/index.js";
import { compileInstrument, parseInstrument } from "../src/instrument/index.js";
import { compileMeasurement } from "../src/measurement/index.js";
import { parseQuantBundle } from "../src/bundle.js";
import { compileRecode } from "../src/recode/index.js";
import { compileTopicCard } from "../src/topic-card/index.js";
import { loadExample } from "./helpers.js";

describe("workflow-readiness demonstration family", () => {
  it("validates the instrument shape and demonstration boundary", () => {
    const input = loadExample("workflow-readiness-instrument.json");
    const compiled = compileInstrument(input);
    const instrument = compiled.artifact.instrument;

    expect(compiled.receipt.status).toBe("compiled");
    expect(instrument.constructs.map((construct) => construct.code)).toEqual(["WC", "DC", "SR", "CI"]);
    expect(instrument.constructs.map((construct) => construct.items.length)).toEqual([4, 3, 5, 4]);
    expect(instrument.constructs.map((construct) => `${construct.scale.min}-${construct.scale.max}`)).toEqual([
      "1-7",
      "1-5",
      "1-7",
      "1-5",
    ]);
    expect(compiled.artifact.dictionary).toHaveLength(16);
    expect(compiled.artifact.dictionary.filter((item) => item.reverse).map((item) => item.itemCode)).toEqual([
      "WC3",
      "DC2",
      "SR3",
      "CI4",
    ]);
    expect(
      instrument.constructs.flatMap((construct) => construct.items).every(
        (item) =>
          item.status === "demonstration" &&
          /demonstration.*not a published scale/i.test(item.source?.note ?? ""),
      ),
    ).toBe(true);
    expect(JSON.stringify(input)).not.toMatch(/citation/i);
  });

  it("runs topic, measurement, gap, dataset, recode, and bundle validation", () => {
    const instrument = parseInstrument(loadExample("workflow-readiness-instrument.json"));
    const topicCard = compileTopicCard(loadExample("workflow-readiness-topic-card.json"), instrument);
    const measurement = compileMeasurement(
      loadExample("workflow-readiness-measurement.json"),
      instrument,
      topicCard.artifact,
    );
    const dataset = parseDataset(loadExample("workflow-readiness-dataset.json"));
    const audit = auditDataset(loadExample("workflow-readiness-dataset.json"), instrument);
    const gap = compileGapMap(loadExample("workflow-readiness-observed.json"), instrument);
    const rawRows = JSON.stringify(dataset.rows);
    const recode = compileRecode(loadExample("workflow-readiness-recode.json"), dataset, instrument);
    const bundle = parseQuantBundle(loadExample("workflow-readiness-bundle.json"));

    expect(topicCard.artifact.constructCodes).toEqual(["WC", "DC", "SR", "CI"]);
    expect(topicCard.artifact.hypotheses).toHaveLength(5);
    expect(measurement.artifact.mode).toBe("pls-sem");
    expect(measurement.artifact.constructs.map((construct) => construct.itemCount)).toEqual([4, 3, 5, 4]);
    expect(measurement.artifact.paths).toHaveLength(5);
    expect(gap.artifact.rows.every((row) => row.status === "covered")).toBe(true);
    expect(gap.artifact.unexpected).toHaveLength(0);
    expect(audit.receipt.status).toBe("audited");
    expect(audit.artifact.dataset.rows).toHaveLength(4);
    expect(audit.receipt.counts.straightLineRows).toBe(1);
    expect(audit.receipt.counts.missingCells).toBe(1);
    expect(recode.artifact.rows[1]?.WC3_R).toBe(6);
    expect(recode.artifact.rows[1]?.DC2_R).toBe(4);
    expect(recode.artifact.rows[0]?.WC_MEAN).toBeCloseTo(4, 10);
    expect(recode.artifact.rows[0]?.CI_MEAN).toBeCloseTo(3.5, 10);
    expect(recode.artifact.rows[0]?.STRAIGHT).toBe(1);
    expect(JSON.stringify(dataset.rows)).toBe(rawRows);
    expect(bundle.instrument.constructs).toHaveLength(4);
    expect(bundle.topicCard.hypotheses).toHaveLength(5);
    expect(bundle.measurement.mode).toBe("pls-sem");
  });
});
