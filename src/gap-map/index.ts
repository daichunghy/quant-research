import { ERROR_CODES, finding, throwIfErrors, type Finding } from "../core/errors.js";
import { requireNonEmptyArray, requireRecord, requireSchema, requireString } from "../core/parse.js";
import { compileOk } from "../core/receipt.js";
import {
  SCHEMA,
  type Compiled,
  type GapMapArtifact,
  type GapMapInput,
  type GapMapRow,
  type GapStatus,
  type Instrument,
  type ObservedColumn,
  type ScaleSpec,
} from "../core/types.js";
import { indexInstrument } from "../instrument/index.js";

function parseScaleHint(value: unknown, path: string, issues: Finding[]): ScaleSpec | undefined {
  if (value === undefined) {
    return undefined;
  }
  const record = requireRecord(value, path, issues);
  if (!record) {
    return undefined;
  }
  const min = record.min;
  const max = record.max;
  if (typeof min !== "number" || typeof max !== "number" || !Number.isInteger(min) || !Number.isInteger(max)) {
    issues.push(finding(ERROR_CODES.invalid_scale, path, "Observed scale.min and scale.max must be integers."));
    return undefined;
  }
  return { min, max };
}

function parseObserved(value: unknown, path: string, issues: Finding[]): ObservedColumn | undefined {
  const record = requireRecord(value, path, issues);
  if (!record) {
    return undefined;
  }
  const column = requireString(record, "column", `${path}.column`, issues);
  const itemCode = typeof record.itemCode === "string" ? record.itemCode : undefined;
  const constructCode = typeof record.constructCode === "string" ? record.constructCode : undefined;
  const reverse = typeof record.reverse === "boolean" ? record.reverse : undefined;
  const scale = parseScaleHint(record.scale, `${path}.scale`, issues);
  if (record.itemCode !== undefined && typeof record.itemCode !== "string") {
    issues.push(finding(ERROR_CODES.invalid_type, `${path}.itemCode`, "itemCode must be a string when present."));
  }
  if (record.constructCode !== undefined && typeof record.constructCode !== "string") {
    issues.push(
      finding(ERROR_CODES.invalid_type, `${path}.constructCode`, "constructCode must be a string when present."),
    );
  }
  if (!itemCode && !constructCode) {
    issues.push(
      finding(
        ERROR_CODES.missing_field,
        path,
        "Observed columns must include itemCode and/or constructCode.",
      ),
    );
  }
  return {
    column,
    ...(itemCode ? { itemCode } : {}),
    ...(constructCode ? { constructCode } : {}),
    ...(reverse !== undefined ? { reverse } : {}),
    ...(scale ? { scale } : {}),
  };
}

export function parseGapMapInput(input: unknown): GapMapInput {
  const issues: Finding[] = [];
  const record = requireRecord(input, "$", issues);
  if (!record) {
    throwIfErrors(issues);
    throw new Error("unreachable");
  }
  requireSchema(record, SCHEMA.gapMap, issues);
  const observed = requireNonEmptyArray(record, "observed", "observed", issues)
    .map((item, index) => parseObserved(item, `observed[${index}]`, issues))
    .filter((item): item is ObservedColumn => item !== undefined);
  throwIfErrors(issues);
  return { schemaVersion: SCHEMA.gapMap, observed };
}

export function observedFromDataset(dataset: { columns: readonly { name: string; itemCode?: string }[] }): GapMapInput {
  const observed = dataset.columns
    .filter((column) => Boolean(column.itemCode))
    .map((column) => ({
      column: column.name,
      ...(column.itemCode ? { itemCode: column.itemCode } : {}),
    }));
  return { schemaVersion: SCHEMA.gapMap, observed };
}

export function compileGapMap(input: unknown, instrument: Instrument): Compiled<GapMapArtifact> {
  const parsed = parseGapMapInput(input);
  const index = indexInstrument(instrument);
  const unexpected: ObservedColumn[] = [];
  const notesByConstruct = new Map<string, string[]>();
  const columnsByConstruct = new Map<string, string[]>();
  const observedItemsByConstruct = new Map<string, Set<string>>();

  for (const observed of parsed.observed) {
    const itemRef = observed.itemCode ? index.items.get(observed.itemCode) : undefined;
    const constructCode = observed.constructCode ?? itemRef?.construct.code;
    if (observed.itemCode && !itemRef) {
      unexpected.push(observed);
      continue;
    }
    if (observed.constructCode && !index.constructs.has(observed.constructCode)) {
      unexpected.push(observed);
      continue;
    }
    if (!constructCode) {
      unexpected.push(observed);
      continue;
    }
    const construct = index.constructs.get(constructCode);
    if (!construct) {
      unexpected.push(observed);
      continue;
    }
    const columns = columnsByConstruct.get(constructCode) ?? [];
    columns.push(observed.column);
    columnsByConstruct.set(constructCode, columns);

    const notes = notesByConstruct.get(constructCode) ?? [];
    if (itemRef) {
      const items = observedItemsByConstruct.get(constructCode) ?? new Set<string>();
      items.add(itemRef.item.code);
      observedItemsByConstruct.set(constructCode, items);
      if (observed.reverse !== undefined && observed.reverse !== itemRef.item.reverse) {
        notes.push(`${observed.column}: reverse flag does not match instrument item ${itemRef.item.code}.`);
      }
      if (
        observed.scale &&
        (observed.scale.min !== itemRef.construct.scale.min || observed.scale.max !== itemRef.construct.scale.max)
      ) {
        notes.push(`${observed.column}: scale ${observed.scale.min}-${observed.scale.max} does not match instrument.`);
      }
    }
    notesByConstruct.set(constructCode, notes);
  }

  const rows: GapMapRow[] = instrument.constructs.map((construct) => {
    const expectedItems = construct.items.length;
    const observedSet = observedItemsByConstruct.get(construct.code) ?? new Set<string>();
    const observedItems = observedSet.size;
    const missingItemCodes = construct.items.filter((item) => !observedSet.has(item.code)).map((item) => item.code);
    const notes = notesByConstruct.get(construct.code) ?? [];
    let status: GapStatus;
    if (notes.length > 0) {
      status = "mismatch";
    } else if (observedItems === 0) {
      status = "missing";
    } else if (observedItems < expectedItems) {
      status = "partial";
    } else {
      status = "covered";
    }
    return {
      constructCode: construct.code,
      constructName: construct.name,
      status,
      expectedItems,
      observedItems,
      missingItemCodes,
      observedColumns: columnsByConstruct.get(construct.code) ?? [],
      notes,
    };
  });

  const artifact: GapMapArtifact = { rows, unexpected };
  return compileOk("gap-map", input, artifact, [], {
    constructs: rows.length,
    observed: parsed.observed.length,
    items: rows.filter((row) => row.status === "covered").length,
  });
}
