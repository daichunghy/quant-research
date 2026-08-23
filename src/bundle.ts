import { ERROR_CODES, finding, throwIfErrors, type Finding } from "./core/errors.js";
import { requireRecord } from "./core/parse.js";
import type { QuantBundle } from "./core/types.js";
import { parseInstrument } from "./instrument/index.js";
import { compileMeasurement } from "./measurement/index.js";
import { parseTopicCard } from "./topic-card/index.js";

export function parseQuantBundle(input: unknown): QuantBundle {
  const issues: Finding[] = [];
  const record = requireRecord(input, "$", issues);
  if (!record) {
    throwIfErrors(issues);
    throw new Error("unreachable");
  }
  if (!("instrument" in record) || !("topicCard" in record) || !("measurement" in record)) {
    issues.push(
      finding(
        ERROR_CODES.missing_field,
        "$",
        "Bundle must include instrument, topicCard, and measurement objects.",
      ),
    );
    throwIfErrors(issues);
  }
  const instrument = parseInstrument(record.instrument);
  const topicCard = parseTopicCard(record.topicCard, instrument);
  const measurement = compileMeasurement(record.measurement, instrument, topicCard).artifact;
  return { instrument, topicCard, measurement };
}
