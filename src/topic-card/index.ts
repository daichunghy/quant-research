import { ERROR_CODES, finding, throwIfErrors, type Finding } from "../core/errors.js";
import {
  requireArray,
  requireCode,
  requireEnum,
  requireNonEmptyArray,
  requireRecord,
  requireSchema,
  requireString,
} from "../core/parse.js";
import { compileOk } from "../core/receipt.js";
import {
  SCHEMA,
  type Compiled,
  type Hypothesis,
  type HypothesisSign,
  type Instrument,
  type TopicCard,
} from "../core/types.js";
import { indexInstrument } from "../instrument/index.js";

const CLAIM_CLASSES = ["description", "association", "prediction", "causal"] as const;
const ENGINES = ["spss", "amos", "smartpls", "lavaan"] as const;
const MODES = ["confirmatory", "exploratory"] as const;
const SIGNS = ["+", "-"] as const;

function parseHypothesis(value: unknown, path: string, issues: Finding[]): Hypothesis | undefined {
  const record = requireRecord(value, path, issues);
  if (!record) {
    return undefined;
  }
  const id = requireCode(requireString(record, "id", `${path}.id`, issues), `${path}.id`, issues);
  const from = requireCode(requireString(record, "from", `${path}.from`, issues), `${path}.from`, issues);
  const to = requireCode(requireString(record, "to", `${path}.to`, issues), `${path}.to`, issues);
  const sign: HypothesisSign =
    "sign" in record
      ? (requireEnum(record, "sign", `${path}.sign`, SIGNS, issues) ?? "+")
      : "+";
  if (from === to) {
    issues.push(finding(ERROR_CODES.orphan_hypothesis, path, "Hypothesis from and to must be different constructs."));
  }
  return { id, from, to, sign };
}

export function parseTopicCard(input: unknown, instrument: Instrument): TopicCard {
  const issues: Finding[] = [];
  const record = requireRecord(input, "$", issues);
  if (!record) {
    throwIfErrors(issues);
    throw new Error("unreachable");
  }
  requireSchema(record, SCHEMA.topicCard, issues);
  const question = requireString(record, "question", "question", issues);
  const claimClass = requireEnum(record, "claimClass", "claimClass", CLAIM_CLASSES, issues);
  const population = requireString(record, "population", "population", issues);
  const unit = requireString(record, "unit", "unit", issues);
  const timeframe = requireString(record, "timeframe", "timeframe", issues);
  const engine = requireEnum(record, "engine", "engine", ENGINES, issues);
  const mode = requireEnum(record, "mode", "mode", MODES, issues);
  const rawCodes = requireNonEmptyArray(record, "constructCodes", "constructCodes", issues);
  const constructCodes: string[] = [];
  const seenCodes = new Set<string>();
  const index = indexInstrument(instrument);

  for (const [i, value] of rawCodes.entries()) {
    if (typeof value !== "string") {
      issues.push(finding(ERROR_CODES.invalid_type, `constructCodes[${i}]`, "constructCodes entries must be strings."));
      continue;
    }
    const code = requireCode(value, `constructCodes[${i}]`, issues);
    if (seenCodes.has(code)) {
      issues.push(finding(ERROR_CODES.duplicate_code, `constructCodes[${i}]`, `Duplicate construct code ${code}.`));
    }
    seenCodes.add(code);
    if (!index.constructs.has(code)) {
      issues.push(
        finding(ERROR_CODES.unknown_construct, `constructCodes[${i}]`, `Construct ${code} is not in the instrument.`),
      );
    }
    constructCodes.push(code);
  }

  const rawHypotheses = requireArray(record, "hypotheses", "hypotheses", issues);
  const hypotheses = rawHypotheses
    .map((item, i) => parseHypothesis(item, `hypotheses[${i}]`, issues))
    .filter((item): item is Hypothesis => item !== undefined);

  const hypothesisIds = new Set<string>();
  for (const [i, hypothesis] of hypotheses.entries()) {
    if (hypothesisIds.has(hypothesis.id)) {
      issues.push(finding(ERROR_CODES.duplicate_code, `hypotheses[${i}].id`, `Duplicate hypothesis id ${hypothesis.id}.`));
    }
    hypothesisIds.add(hypothesis.id);
    if (!seenCodes.has(hypothesis.from) || !index.constructs.has(hypothesis.from)) {
      issues.push(
        finding(
          ERROR_CODES.orphan_hypothesis,
          `hypotheses[${i}].from`,
          `Hypothesis ${hypothesis.id} references unknown construct ${hypothesis.from}.`,
        ),
      );
    }
    if (!seenCodes.has(hypothesis.to) || !index.constructs.has(hypothesis.to)) {
      issues.push(
        finding(
          ERROR_CODES.orphan_hypothesis,
          `hypotheses[${i}].to`,
          `Hypothesis ${hypothesis.id} references unknown construct ${hypothesis.to}.`,
        ),
      );
    }
  }

  throwIfErrors(issues);
  if (!claimClass || !engine || !mode) {
    throwIfErrors(issues);
    throw new Error("unreachable");
  }

  return {
    schemaVersion: SCHEMA.topicCard,
    question,
    claimClass,
    population,
    unit,
    timeframe,
    constructCodes,
    hypotheses,
    engine,
    mode,
  };
}

export function compileTopicCard(input: unknown, instrument: Instrument): Compiled<TopicCard> {
  const artifact = parseTopicCard(input, instrument);
  return compileOk("topic-card", input, artifact, [], {
    constructs: artifact.constructCodes.length,
    hypotheses: artifact.hypotheses.length,
  });
}
