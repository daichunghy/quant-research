import { ERROR_CODES, finding, throwIfErrors, type Finding } from "../core/errors.js";
import {
  optionalBoolean,
  requireCode,
  requireEnum,
  requireNonEmptyArray,
  requireRecord,
  requireSchema,
  requireString,
  rejectUnknownKeys,
} from "../core/parse.js";
import { compileOk } from "../core/receipt.js";
import {
  SCHEMA,
  type Compiled,
  type DictionaryRow,
  type Instrument,
  type InstrumentArtifact,
  type InstrumentConstruct,
  type InstrumentItem,
  type ItemSource,
  type ScaleAnchor,
  type ScaleSpec,
} from "../core/types.js";

const ALLOWED_MIN = new Set([1, 2]);
const ALLOWED_MAX = new Set([5, 7]);

export interface InstrumentIndex {
  readonly constructs: ReadonlyMap<string, InstrumentConstruct>;
  readonly items: ReadonlyMap<string, { construct: InstrumentConstruct; item: InstrumentItem }>;
}

export function indexInstrument(instrument: Instrument): InstrumentIndex {
  const constructs = new Map<string, InstrumentConstruct>();
  const items = new Map<string, { construct: InstrumentConstruct; item: InstrumentItem }>();
  for (const construct of instrument.constructs) {
    constructs.set(construct.code, construct);
    for (const item of construct.items) {
      items.set(item.code, { construct, item });
    }
  }
  return { constructs, items };
}

function parseSource(value: unknown, path: string, issues: Finding[]): ItemSource | undefined {
  if (value === undefined) {
    return undefined;
  }
  const record = requireRecord(value, path, issues);
  if (!record) {
    return undefined;
  }
  const citation = typeof record.citation === "string" ? record.citation.trim() : undefined;
  const note = typeof record.note === "string" ? record.note.trim() : undefined;
  if (record.citation !== undefined && (typeof record.citation !== "string" || record.citation.trim() === "")) {
    issues.push(finding(ERROR_CODES.invalid_type, `${path}.citation`, "citation must be a non-empty string when present."));
  }
  if (record.note !== undefined && (typeof record.note !== "string" || record.note.trim() === "")) {
    issues.push(finding(ERROR_CODES.invalid_type, `${path}.note`, "note must be a non-empty string when present."));
  }
  const source: ItemSource = {
    ...(citation ? { citation } : {}),
    ...(note ? { note } : {}),
  };
  return source;
}

function parseAnchors(
  value: unknown,
  path: string,
  min: number,
  max: number,
  issues: Finding[],
): readonly ScaleAnchor[] | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!Array.isArray(value) || value.length === 0) {
    issues.push(finding(ERROR_CODES.empty_collection, path, "anchors must be a non-empty array when present."));
    return undefined;
  }
  const anchors: ScaleAnchor[] = [];
  const seen = new Set<number>();
  for (const [index, entry] of value.entries()) {
    const record = requireRecord(entry, `${path}[${index}]`, issues);
    if (!record) {
      continue;
    }
    const rawValue = record.value;
    const label = requireString(record, "label", `${path}[${index}].label`, issues);
    if (typeof rawValue !== "number" || !Number.isInteger(rawValue)) {
      issues.push(finding(ERROR_CODES.invalid_anchor, `${path}[${index}].value`, "Anchor value must be an integer."));
      continue;
    }
    if (rawValue < min || rawValue > max) {
      issues.push(
        finding(ERROR_CODES.invalid_anchor, `${path}[${index}].value`, `Anchor value must be between ${min} and ${max}.`),
      );
    }
    if (seen.has(rawValue)) {
      issues.push(finding(ERROR_CODES.duplicate_code, `${path}[${index}].value`, `Duplicate anchor value ${rawValue}.`));
    }
    seen.add(rawValue);
    anchors.push({ value: rawValue, label });
  }
  if (!seen.has(min) || !seen.has(max)) {
    issues.push(
      finding(
        ERROR_CODES.reverse_scale_unsupported,
        path,
        "When anchors are provided they must include both scale min and max.",
      ),
    );
  }
  return anchors;
}

function parseScale(value: unknown, path: string, issues: Finding[]): ScaleSpec {
  const record = requireRecord(value, path, issues);
  if (!record) {
    return { min: 1, max: 5 };
  }
  const min = record.min;
  const max = record.max;
  if (typeof min !== "number" || !ALLOWED_MIN.has(min)) {
    issues.push(finding(ERROR_CODES.invalid_scale, `${path}.min`, "scale.min must be 1 or 2."));
  }
  if (typeof max !== "number" || !ALLOWED_MAX.has(max)) {
    issues.push(finding(ERROR_CODES.invalid_scale, `${path}.max`, "scale.max must be 5 or 7."));
  }
  if (typeof min === "number" && typeof max === "number" && min >= max) {
    issues.push(finding(ERROR_CODES.invalid_scale, path, "scale.min must be less than scale.max."));
  }
  const resolvedMin = typeof min === "number" ? min : 1;
  const resolvedMax = typeof max === "number" ? max : 5;
  const anchors = parseAnchors(record.anchors, `${path}.anchors`, resolvedMin, resolvedMax, issues);
  return anchors ? { min: resolvedMin, max: resolvedMax, anchors } : { min: resolvedMin, max: resolvedMax };
}

function parseItem(value: unknown, path: string, issues: Finding[]): InstrumentItem | undefined {
  const record = requireRecord(value, path, issues);
  if (!record) {
    return undefined;
  }
  const code = requireCode(requireString(record, "code", `${path}.code`, issues), `${path}.code`, issues);
  const text = requireString(record, "text", `${path}.text`, issues);
  const status = requireEnum(record, "status", `${path}.status`, ["demonstration", "cited"] as const, issues);
  const reverse = optionalBoolean(record, "reverse", `${path}.reverse`, issues) ?? false;
  const source = parseSource(record.source, `${path}.source`, issues);
  if (status === "cited" && !source?.citation) {
    issues.push(
      finding(
        ERROR_CODES.cited_without_source,
        `${path}.source.citation`,
        "Items with status cited must include source.citation.",
      ),
    );
  }
  if (!status) {
    return undefined;
  }
  return {
    code,
    text,
    reverse,
    status,
    ...(source && (source.citation || source.note) ? { source } : {}),
  };
}

function parseConstruct(value: unknown, path: string, issues: Finding[]): InstrumentConstruct | undefined {
  const record = requireRecord(value, path, issues);
  if (!record) {
    return undefined;
  }
  const code = requireCode(requireString(record, "code", `${path}.code`, issues), `${path}.code`, issues);
  const name = requireString(record, "name", `${path}.name`, issues);
  const kind = requireEnum(record, "kind", `${path}.kind`, ["reflective", "formative"] as const, issues);
  const scale = parseScale(record.scale, `${path}.scale`, issues);
  const rawItems = requireNonEmptyArray(record, "items", `${path}.items`, issues);
  const items = rawItems
    .map((item, index) => parseItem(item, `${path}.items[${index}]`, issues))
    .filter((item): item is InstrumentItem => item !== undefined);
  if (!kind) {
    return undefined;
  }
  return { code, name, kind, scale, items };
}

export function parseInstrument(input: unknown): Instrument {
  const issues: Finding[] = [];
  const record = requireRecord(input, "$", issues);
  if (!record) {
    throwIfErrors(issues);
    throw new Error("unreachable");
  }
  rejectUnknownKeys(record, ["schemaVersion", "language", "constructs"], "$", issues);
  requireSchema(record, SCHEMA.instrument, issues);
  const language = requireString(record, "language", "language", issues);
  const rawConstructs = requireNonEmptyArray(record, "constructs", "constructs", issues);
  const constructs = rawConstructs
    .map((construct, index) => parseConstruct(construct, `constructs[${index}]`, issues))
    .filter((construct): construct is InstrumentConstruct => construct !== undefined);

  const constructCodes = new Set<string>();
  const itemCodes = new Set<string>();
  for (const [index, construct] of constructs.entries()) {
    if (constructCodes.has(construct.code)) {
      issues.push(
        finding(ERROR_CODES.duplicate_code, `constructs[${index}].code`, `Duplicate construct code ${construct.code}.`),
      );
    }
    constructCodes.add(construct.code);
    for (const [itemIndex, item] of construct.items.entries()) {
      if (itemCodes.has(item.code)) {
        issues.push(
          finding(
            ERROR_CODES.duplicate_code,
            `constructs[${index}].items[${itemIndex}].code`,
            `Duplicate item code ${item.code}.`,
          ),
        );
      }
      itemCodes.add(item.code);
    }
  }

  throwIfErrors(issues);
  return {
    schemaVersion: SCHEMA.instrument,
    language,
    constructs,
  };
}

export function buildDictionary(instrument: Instrument): readonly DictionaryRow[] {
  return instrument.constructs.flatMap((construct) =>
    construct.items.map((item) => ({
      constructCode: construct.code,
      constructName: construct.name,
      itemCode: item.code,
      text: item.text,
      min: construct.scale.min,
      max: construct.scale.max,
      reverse: item.reverse,
      status: item.status,
      citation: item.source?.citation ?? "",
    })),
  );
}

export function compileInstrument(input: unknown): Compiled<InstrumentArtifact> {
  const instrument = parseInstrument(input);
  const dictionary = buildDictionary(instrument);
  const artifact: InstrumentArtifact = { instrument, dictionary };
  const warnings: Finding[] = [];
  for (const construct of instrument.constructs) {
    for (const item of construct.items) {
      if (!item.code.startsWith(construct.code)) {
        warnings.push(
          finding(
            ERROR_CODES.invalid_identifier,
            `items.${item.code}`,
            `Item code ${item.code} does not start with construct code ${construct.code}.`,
            "warning",
          ),
        );
      }
    }
  }
  return compileOk(
    "instrument",
    input,
    artifact,
    warnings,
    {
      constructs: instrument.constructs.length,
      items: dictionary.length,
    },
  );
}
