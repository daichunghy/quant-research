import { ERROR_CODES, finding, throwIfErrors, type Finding } from "../core/errors.js";
import {
  requireColumnName,
  requireNonEmptyArray,
  requireRecord,
  requireSchema,
  requireString,
} from "../core/parse.js";
import { compileOk } from "../core/receipt.js";
import {
  SCHEMA,
  type CellValue,
  type Compiled,
  type Dataset,
  type DatasetColumn,
  type Instrument,
  type RecodeArtifact,
  type RecodeLogEntry,
  type RecodeOperation,
  type RecodePlan,
} from "../core/types.js";
import { indexInstrument } from "../instrument/index.js";

function parseSentinel(value: unknown, path: string, issues: Finding[]): string | number | undefined {
  if (typeof value === "string" || typeof value === "number") {
    if (typeof value === "number" && !Number.isFinite(value)) {
      issues.push(finding(ERROR_CODES.invalid_type, path, "Sentinels must be finite numbers or strings."));
      return undefined;
    }
    return value;
  }
  issues.push(finding(ERROR_CODES.invalid_type, path, "Sentinels must be strings or numbers."));
  return undefined;
}

function parseOperation(value: unknown, path: string, issues: Finding[]): RecodeOperation | undefined {
  const record = requireRecord(value, path, issues);
  if (!record) {
    return undefined;
  }
  const kind = record.kind;
  if (kind === "reverse-score") {
    const itemCode = requireString(record, "itemCode", `${path}.itemCode`, issues);
    const as = requireColumnName(requireString(record, "as", `${path}.as`, issues), `${path}.as`, issues);
    return { kind, itemCode, as };
  }
  if (kind === "copy-as") {
    const from = requireString(record, "from", `${path}.from`, issues);
    const as = requireColumnName(requireString(record, "as", `${path}.as`, issues), `${path}.as`, issues);
    return { kind, from, as };
  }
  if (kind === "missing-code") {
    const column = requireString(record, "column", `${path}.column`, issues);
    const as = requireColumnName(requireString(record, "as", `${path}.as`, issues), `${path}.as`, issues);
    const sentinels = requireNonEmptyArray(record, "sentinels", `${path}.sentinels`, issues)
      .map((item, index) => parseSentinel(item, `${path}.sentinels[${index}]`, issues))
      .filter((item): item is string | number => item !== undefined);
    return { kind, column, sentinels, as };
  }
  if (kind === "flag-straight-line") {
    const as = requireColumnName(requireString(record, "as", `${path}.as`, issues), `${path}.as`, issues);
    return { kind, as };
  }
  if (kind === "construct-score") {
    const constructCode = requireString(record, "constructCode", `${path}.constructCode`, issues);
    const as = requireColumnName(requireString(record, "as", `${path}.as`, issues), `${path}.as`, issues);
    return { kind, constructCode, as };
  }
  issues.push(
    finding(
      ERROR_CODES.invalid_enum,
      `${path}.kind`,
      "kind must be reverse-score, copy-as, missing-code, flag-straight-line, or construct-score.",
    ),
  );
  return undefined;
}

export function parseRecodePlan(input: unknown): RecodePlan {
  const issues: Finding[] = [];
  const record = requireRecord(input, "$", issues);
  if (!record) {
    throwIfErrors(issues);
    throw new Error("unreachable");
  }
  requireSchema(record, SCHEMA.recode, issues);
  const operations = requireNonEmptyArray(record, "operations", "operations", issues)
    .map((item, index) => parseOperation(item, `operations[${index}]`, issues))
    .filter((item): item is RecodeOperation => item !== undefined);
  throwIfErrors(issues);
  return { schemaVersion: SCHEMA.recode, operations };
}

export function recodePlanFromInstrument(instrument: Instrument): RecodePlan {
  const operations: RecodeOperation[] = [];
  for (const construct of instrument.constructs) {
    for (const item of construct.items) {
      if (item.reverse) {
        operations.push({ kind: "reverse-score", itemCode: item.code, as: `${item.code}_R` });
      }
    }
    operations.push({ kind: "construct-score", constructCode: construct.code, as: `${construct.code}_MEAN` });
  }
  operations.push({ kind: "flag-straight-line", as: "STRAIGHT" });
  return { schemaVersion: SCHEMA.recode, operations };
}

function cloneRows(dataset: Dataset): Record<string, CellValue>[] {
  return dataset.rows.map((row) => ({ ...row }));
}

function findColumn(dataset: Dataset, name: string): DatasetColumn | undefined {
  return dataset.columns.find((column) => column.name === name);
}

function indicatorValues(row: Readonly<Record<string, CellValue>>, dataset: Dataset): number[] | undefined {
  const values: number[] = [];
  for (const column of dataset.columns) {
    if (column.role !== "indicator") {
      continue;
    }
    const raw = row[column.name];
    if (raw === null || raw === undefined) {
      return undefined;
    }
    if (typeof raw !== "number") {
      return undefined;
    }
    values.push(raw);
  }
  return values.length >= 3 ? values : undefined;
}

export function compileRecode(
  input: unknown,
  dataset: Dataset,
  instrument: Instrument,
): Compiled<RecodeArtifact> {
  const plan = parseRecodePlan(input);
  const issues: Finding[] = [];
  const index = indexInstrument(instrument);
  const columns: DatasetColumn[] = dataset.columns.map((column) => ({ ...column }));
  const existing = new Set(columns.map((column) => column.name));
  const rows = cloneRows(dataset);
  const log: RecodeLogEntry[] = [];
  let recodedCells = 0;

  for (const [operationIndex, operation] of plan.operations.entries()) {
    if (existing.has(operation.as)) {
      issues.push(
        finding(
          ERROR_CODES.column_exists,
          `operations[${operationIndex}].as`,
          `Recode target ${operation.as} already exists. Recodes may only create new columns.`,
        ),
      );
      continue;
    }

    if (operation.kind === "reverse-score") {
      const itemRef = index.items.get(operation.itemCode);
      if (!itemRef) {
        issues.push(
          finding(
            ERROR_CODES.unknown_item,
            `operations[${operationIndex}].itemCode`,
            `Unknown item ${operation.itemCode}.`,
          ),
        );
        continue;
      }
      const source = dataset.columns.find((column) => column.itemCode === operation.itemCode);
      if (!source) {
        issues.push(
          finding(
            ERROR_CODES.unknown_column,
            `operations[${operationIndex}].itemCode`,
            `No dataset column mapped to item ${operation.itemCode}.`,
          ),
        );
        continue;
      }
      const min = itemRef.construct.scale.min;
      const max = itemRef.construct.scale.max;
      let affected = 0;
      for (const [rowIndex, row] of rows.entries()) {
        const raw = row[source.name];
        if (raw === null || raw === undefined) {
          row[operation.as] = null;
          continue;
        }
        if (typeof raw !== "number") {
          issues.push(
            finding(
              ERROR_CODES.non_numeric,
              `rows[${rowIndex}].${source.name}`,
              `Cannot reverse-score non-numeric value in ${source.name}.`,
            ),
          );
          row[operation.as] = null;
          continue;
        }
        row[operation.as] = min + max - raw;
        affected += 1;
      }
      columns.push({ name: operation.as, role: "indicator", itemCode: operation.itemCode });
      existing.add(operation.as);
      recodedCells += affected;
      log.push({ operationIndex, kind: operation.kind, target: operation.as, affectedCells: affected });
      continue;
    }

    if (operation.kind === "copy-as") {
      if (!findColumn(dataset, operation.from) && !existing.has(operation.from)) {
        issues.push(
          finding(
            ERROR_CODES.unknown_column,
            `operations[${operationIndex}].from`,
            `Unknown source column ${operation.from}.`,
          ),
        );
        continue;
      }
      const sourceColumn = columns.find((column) => column.name === operation.from);
      let affected = 0;
      for (const row of rows) {
        const value = row[operation.from] ?? null;
        row[operation.as] = value;
        if (value !== null) {
          affected += 1;
        }
      }
      columns.push({
        name: operation.as,
        role: sourceColumn?.role ?? "other",
        ...(sourceColumn?.itemCode ? { itemCode: sourceColumn.itemCode } : {}),
      });
      existing.add(operation.as);
      recodedCells += affected;
      log.push({ operationIndex, kind: operation.kind, target: operation.as, affectedCells: affected });
      continue;
    }

    if (operation.kind === "missing-code") {
      if (!findColumn(dataset, operation.column)) {
        issues.push(
          finding(
            ERROR_CODES.unknown_column,
            `operations[${operationIndex}].column`,
            `Unknown column ${operation.column}.`,
          ),
        );
        continue;
      }
      const sentinels = new Set(operation.sentinels.map((item) => JSON.stringify(item)));
      let affected = 0;
      for (const row of rows) {
        const value = row[operation.column] ?? null;
        if (value !== null && sentinels.has(JSON.stringify(value))) {
          row[operation.as] = null;
          affected += 1;
        } else {
          row[operation.as] = value;
        }
      }
      const sourceColumn = findColumn(dataset, operation.column);
      columns.push({
        name: operation.as,
        role: sourceColumn?.role ?? "other",
        ...(sourceColumn?.itemCode ? { itemCode: sourceColumn.itemCode } : {}),
      });
      existing.add(operation.as);
      recodedCells += affected;
      log.push({ operationIndex, kind: operation.kind, target: operation.as, affectedCells: affected });
      continue;
    }

    if (operation.kind === "construct-score") {
      const construct = index.constructs.get(operation.constructCode);
      if (!construct) {
        issues.push(
          finding(
            ERROR_CODES.unknown_construct,
            `operations[${operationIndex}].constructCode`,
            `Unknown construct ${operation.constructCode}.`,
          ),
        );
        continue;
      }
      const itemColumns = construct.items.map((item) => {
        const column = dataset.columns.find((entry) => entry.itemCode === item.code);
        return { item, column };
      });
      const missingMap = itemColumns.filter((entry) => !entry.column);
      if (missingMap.length > 0) {
        issues.push(
          finding(
            ERROR_CODES.unknown_column,
            `operations[${operationIndex}]`,
            `Construct ${construct.code} is missing indicator columns for ${missingMap.map((entry) => entry.item.code).join(", ")}.`,
          ),
        );
        continue;
      }
      let affected = 0;
      for (const [rowIndex, row] of rows.entries()) {
        const scored: number[] = [];
        for (const entry of itemColumns) {
          const column = entry.column;
          if (!column) {
            continue;
          }
          const raw = row[column.name];
          if (raw === null || raw === undefined) {
            continue;
          }
          if (typeof raw !== "number") {
            issues.push(
              finding(
                ERROR_CODES.non_numeric,
                `rows[${rowIndex}].${column.name}`,
                `Cannot score non-numeric value in ${column.name}.`,
              ),
            );
            continue;
          }
          const value = entry.item.reverse
            ? construct.scale.min + construct.scale.max - raw
            : raw;
          scored.push(value);
        }
        if (scored.length === 0) {
          row[operation.as] = null;
          continue;
        }
        const mean = scored.reduce((sum, value) => sum + value, 0) / scored.length;
        row[operation.as] = mean;
        affected += 1;
      }
      columns.push({ name: operation.as, role: "score" });
      existing.add(operation.as);
      recodedCells += affected;
      log.push({ operationIndex, kind: operation.kind, target: operation.as, affectedCells: affected });
      continue;
    }

    let affected = 0;
    for (const row of rows) {
      const values = indicatorValues(row, dataset);
      const flagged = Boolean(values && values.every((value) => value === values[0]));
      row[operation.as] = flagged ? 1 : 0;
      if (flagged) {
        affected += 1;
      }
    }
    columns.push({ name: operation.as, role: "other" });
    existing.add(operation.as);
    recodedCells += affected;
    log.push({ operationIndex, kind: operation.kind, target: operation.as, affectedCells: affected });
  }

  throwIfErrors(issues);

  const originalSnapshot = dataset.rows.map((row) => ({ ...row }));
  for (const [rowIndex, original] of dataset.rows.entries()) {
    for (const column of dataset.columns) {
      if (originalSnapshot[rowIndex]?.[column.name] !== original[column.name]) {
        issues.push(
          finding(ERROR_CODES.invalid_type, `rows[${rowIndex}]`, "Raw dataset rows were mutated; this is a compiler bug."),
        );
      }
    }
  }
  throwIfErrors(issues);

  const artifact: RecodeArtifact = { columns, rows, log };
  return compileOk("recode", input, artifact, [], {
    rows: rows.length,
    columns: columns.length,
    recodedCells,
    items: plan.operations.length,
  });
}
