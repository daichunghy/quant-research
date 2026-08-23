import { ERROR_CODES, finding, throwIfErrors, type Finding } from "../core/errors.js";
import { requireEnum, requireRecord, requireSchema } from "../core/parse.js";
import { compileOk } from "../core/receipt.js";
import {
  SCHEMA,
  type Compiled,
  type EngineOptions,
  type EstimatorName,
  type Instrument,
  type MeasurementConstruct,
  type MeasurementInput,
  type MeasurementModel,
  type MeasurementMode,
  type TopicCard,
} from "../core/types.js";

const MODES = ["cb-sem", "pls-sem", "reliability-only"] as const;
const ESTIMATORS = ["ML", "WLSMV", "PLS"] as const;

function parseEngineOptions(value: unknown, path: string, issues: Finding[]): EngineOptions | undefined {
  if (value === undefined) {
    return undefined;
  }
  const record = requireRecord(value, path, issues);
  if (!record) {
    return undefined;
  }
  if (!("estimator" in record)) {
    return {};
  }
  const estimator = requireEnum(record, "estimator", `${path}.estimator`, ESTIMATORS, issues);
  return estimator ? { estimator } : {};
}

export function parseMeasurementInput(input: unknown): MeasurementInput {
  const issues: Finding[] = [];
  const record = requireRecord(input, "$", issues);
  if (!record) {
    throwIfErrors(issues);
    throw new Error("unreachable");
  }
  requireSchema(record, SCHEMA.measurement, issues);
  const mode = requireEnum(record, "mode", "mode", MODES, issues);
  const engineOptions = parseEngineOptions(record.engineOptions, "engineOptions", issues);
  const strict = record.strict === true;
  if (record.strict !== undefined && typeof record.strict !== "boolean") {
    issues.push(finding(ERROR_CODES.invalid_type, "strict", "strict must be a boolean when present."));
  }
  throwIfErrors(issues);
  if (!mode) {
    throw new Error("unreachable");
  }
  return {
    schemaVersion: SCHEMA.measurement,
    mode,
    ...(engineOptions && Object.keys(engineOptions).length > 0 ? { engineOptions } : {}),
    ...(strict ? { strict: true } : {}),
  };
}

function minItemsForMode(mode: MeasurementMode, kind: MeasurementConstruct["kind"]): number {
  if (mode === "reliability-only") {
    return 2;
  }
  if (mode === "pls-sem") {
    return kind === "formative" ? 1 : 2;
  }
  return kind === "formative" ? 2 : 3;
}

export function compileMeasurement(
  input: unknown,
  instrument: Instrument,
  topicCard: TopicCard,
): Compiled<MeasurementModel> {
  const parsed = parseMeasurementInput(input);
  const findings: Finding[] = [];
  const topicSet = new Set(topicCard.constructCodes);
  const constructs: MeasurementConstruct[] = instrument.constructs
    .filter((construct) => topicSet.has(construct.code))
    .map((construct) => ({
      code: construct.code,
      kind: construct.kind,
      itemCodes: construct.items.map((item) => item.code),
      itemCount: construct.items.length,
    }));

  for (const construct of constructs) {
    const needed = minItemsForMode(parsed.mode, construct.kind);
    if (construct.itemCount < needed) {
      findings.push(
        finding(
          ERROR_CODES.under_identified,
          `constructs.${construct.code}`,
          `${parsed.mode} construct ${construct.code} has ${construct.itemCount} item(s); heuristic minimum is ${needed}. This is a specification warning, not a fitted result.`,
          parsed.strict ? "error" : "warning",
        ),
      );
    }
  }

  if (parsed.mode !== "reliability-only" && topicCard.hypotheses.length === 0) {
    findings.push(
      finding(
        ERROR_CODES.empty_collection,
        "paths",
        "cb-sem and pls-sem specs have no structural paths; this is allowed for measurement-only models.",
        "warning",
      ),
    );
  }

  throwIfErrors(findings);

  const artifact: MeasurementModel = {
    schemaVersion: SCHEMA.measurement,
    mode: parsed.mode,
    engine: topicCard.engine,
    constructs,
    paths: topicCard.hypotheses,
    ...(parsed.engineOptions ? { engineOptions: parsed.engineOptions } : {}),
  };

  return compileOk("measurement", input, artifact, findings, {
    constructs: constructs.length,
    items: constructs.reduce((sum, construct) => sum + construct.itemCount, 0),
    hypotheses: artifact.paths.length,
  });
}

export function estimatorNote(estimator: EstimatorName | undefined, engine: string): string {
  if (!estimator) {
    return `Declared engine ${engine}. No estimator was executed.`;
  }
  return `Declared engine ${engine} with estimator ${estimator}. No estimator was executed.`;
}
