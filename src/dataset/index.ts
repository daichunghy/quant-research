import { ERROR_CODES, finding, throwIfErrors, type Finding } from "../core/errors.js";
import {
  requireColumnName,
  requireEnum,
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
} from "../core/types.js";
import { indexInstrument } from "../instrument/index.js";

const ROLES = ["id", "demographic", "indicator", "score", "other"] as const;
const STRAIGHT_LINE_INDEX_CAP = 100;

export interface AuditFindingRow {
  readonly rowIndex: number;
  readonly id: CellValue;
  readonly kind: "straight-line" | "out-of-bound" | "duplicate-id";
  readonly detail: string;
}

export interface AuditArtifact {
  readonly dataset: Dataset;
  readonly missingItemCodes: readonly string[];
  readonly unexpectedIndicators: readonly string[];
  readonly straightLineRowIndexes: readonly number[];
  readonly duplicateIdValues: readonly string[];
  readonly details: readonly AuditFindingRow[];
}

function parseColumn(value: unknown, path: string, issues: Finding[]): DatasetColumn | undefined {
  const record = requireRecord(value, path, issues);
  if (!record) {
    return undefined;
  }
  const name = requireColumnName(requireString(record, "name", `${path}.name`, issues), `${path}.name`, issues);
  const role = requireEnum(record, "role", `${path}.role`, ROLES, issues);
  const itemCode = typeof record.itemCode === "string" ? record.itemCode : undefined;
  if (record.itemCode !== undefined && typeof record.itemCode !== "string") {
    issues.push(finding(ERROR_CODES.invalid_type, `${path}.itemCode`, "itemCode must be a string when present."));
  }
  if (role === "indicator" && !itemCode) {
    issues.push(finding(ERROR_CODES.missing_field, `${path}.itemCode`, "Indicator columns must include itemCode."));
  }
  if (!role) {
    return undefined;
  }
  return { name, role, ...(itemCode ? { itemCode } : {}) };
}

function parseCell(value: unknown, path: string, issues: Finding[]): CellValue {
  if (value === null) {
    return null;
  }
  if (typeof value === "string" || typeof value === "number") {
    if (typeof value === "number" && !Number.isFinite(value)) {
      issues.push(finding(ERROR_CODES.invalid_type, path, "Numeric cells must be finite."));
      return null;
    }
    return value;
  }
  issues.push(finding(ERROR_CODES.invalid_type, path, "Cells must be string, finite number, or null."));
  return null;
}

export function parseDataset(input: unknown): Dataset {
  const issues: Finding[] = [];
  const record = requireRecord(input, "$", issues);
  if (!record) {
    throwIfErrors(issues);
    throw new Error("unreachable");
  }
  requireSchema(record, SCHEMA.dataset, issues);
  const columns = requireNonEmptyArray(record, "columns", "columns", issues)
    .map((column, index) => parseColumn(column, `columns[${index}]`, issues))
    .filter((column): column is DatasetColumn => column !== undefined);

  const seen = new Set<string>();
  for (const [index, column] of columns.entries()) {
    if (seen.has(column.name)) {
      issues.push(finding(ERROR_CODES.duplicate_column, `columns[${index}].name`, `Duplicate column ${column.name}.`));
    }
    seen.add(column.name);
  }

  if (!Array.isArray(record.rows)) {
    issues.push(finding(ERROR_CODES.invalid_type, "rows", "rows must be an array."));
  }
  const rawRows = Array.isArray(record.rows) ? record.rows : [];
  if (typeof record.rowCount !== "number" || record.rowCount !== rawRows.length) {
    issues.push(
      finding(ERROR_CODES.row_count_mismatch, "rowCount", "rowCount must equal rows.length."),
    );
  }

  const columnNames = new Set(columns.map((column) => column.name));
  const rows: Readonly<Record<string, CellValue>>[] = [];
  for (const [rowIndex, rawRow] of rawRows.entries()) {
    const rowRecord = requireRecord(rawRow, `rows[${rowIndex}]`, issues);
    if (!rowRecord) {
      continue;
    }
    const row: Record<string, CellValue> = {};
    for (const [key, value] of Object.entries(rowRecord)) {
      if (!columnNames.has(key)) {
        issues.push(
          finding(ERROR_CODES.unknown_column, `rows[${rowIndex}].${key}`, `Row includes unknown column ${key}.`),
        );
        continue;
      }
      row[key] = parseCell(value, `rows[${rowIndex}].${key}`, issues);
    }
    rows.push(row);
  }

  throwIfErrors(issues);
  return {
    schemaVersion: SCHEMA.dataset,
    columns,
    rows,
    rowCount: rows.length,
  };
}

function cellKey(value: CellValue): string {
  return JSON.stringify(value);
}

export function auditDataset(input: unknown, instrument: Instrument): Compiled<AuditArtifact> {
  const dataset = parseDataset(input);
  const index = indexInstrument(instrument);
  const findings: Finding[] = [];
  const details: AuditFindingRow[] = [];

  const indicatorColumns = dataset.columns.filter((column) => column.role === "indicator");
  const idColumn = dataset.columns.find((column) => column.role === "id");
  const mappedItemCodes = new Set(
    indicatorColumns.map((column) => column.itemCode).filter((code): code is string => Boolean(code)),
  );
  const missingItemCodes = instrument.constructs.flatMap((construct) =>
    construct.items.map((item) => item.code).filter((code) => !mappedItemCodes.has(code)),
  );
  const unexpectedIndicators = indicatorColumns
    .filter((column) => column.itemCode && !index.items.has(column.itemCode))
    .map((column) => column.name);

  for (const code of missingItemCodes) {
    findings.push(
      finding(ERROR_CODES.unknown_item, "columns", `Instrument item ${code} has no indicator column.`, "warning"),
    );
  }
  for (const column of unexpectedIndicators) {
    findings.push(
      finding(ERROR_CODES.unknown_item, `columns.${column}`, `Indicator column ${column} is not in the instrument.`),
    );
  }

  let missingCells = 0;
  let outOfBoundCells = 0;
  const idSeen = new Map<string, number>();
  const duplicateIdValues: string[] = [];
  const straightLineRowIndexes: number[] = [];

  for (const [rowIndex, row] of dataset.rows.entries()) {
    if (idColumn) {
      const idValue = row[idColumn.name] ?? null;
      if (idValue !== null) {
        const key = cellKey(idValue);
        const previous = idSeen.get(key);
        if (previous !== undefined) {
          duplicateIdValues.push(String(idValue));
          details.push({
            rowIndex,
            id: idValue,
            kind: "duplicate-id",
            detail: `Duplicate id also seen at row ${previous}.`,
          });
          findings.push(
            finding(ERROR_CODES.duplicate_code, `rows[${rowIndex}].${idColumn.name}`, `Duplicate id ${String(idValue)}.`),
          );
        } else {
          idSeen.set(key, rowIndex);
        }
      }
    }

    const indicatorValues: number[] = [];
    let rowComplete = true;
    for (const column of indicatorColumns) {
      const raw = row[column.name];
      if (raw === null || raw === undefined) {
        missingCells += 1;
        rowComplete = false;
        continue;
      }
      const itemRef = column.itemCode ? index.items.get(column.itemCode) : undefined;
      if (typeof raw !== "number") {
        findings.push(
          finding(
            ERROR_CODES.non_numeric,
            `rows[${rowIndex}].${column.name}`,
            `Indicator ${column.name} must be numeric or null.`,
          ),
        );
        rowComplete = false;
        continue;
      }
      if (itemRef && (raw < itemRef.construct.scale.min || raw > itemRef.construct.scale.max)) {
        outOfBoundCells += 1;
        details.push({
          rowIndex,
          id: idColumn ? (row[idColumn.name] ?? null) : null,
          kind: "out-of-bound",
          detail: `${column.name}=${raw} outside ${itemRef.construct.scale.min}-${itemRef.construct.scale.max}.`,
        });
        findings.push(
          finding(
            ERROR_CODES.invalid_scale,
            `rows[${rowIndex}].${column.name}`,
            `Value ${raw} is outside the instrument Likert bounds.`,
          ),
        );
      }
      indicatorValues.push(raw);
    }

    if (rowComplete && indicatorValues.length >= 3 && indicatorValues.every((value) => value === indicatorValues[0])) {
      straightLineRowIndexes.push(rowIndex);
      if (straightLineRowIndexes.length <= STRAIGHT_LINE_INDEX_CAP) {
        details.push({
          rowIndex,
          id: idColumn ? (row[idColumn.name] ?? null) : null,
          kind: "straight-line",
          detail: `All ${indicatorValues.length} indicators equal ${indicatorValues[0]}.`,
        });
      }
    }
  }

  if (straightLineRowIndexes.length > 0) {
    findings.push(
      finding(
        ERROR_CODES.invalid_type,
        "rows",
        `${straightLineRowIndexes.length} straight-line respondent(s) flagged; none were dropped.`,
        "warning",
      ),
    );
  }
  if (missingCells > 0) {
    findings.push(
      finding(ERROR_CODES.missing_field, "rows", `${missingCells} missing indicator cell(s).`, "warning"),
    );
  }

  const cappedIndexes = straightLineRowIndexes.slice(0, STRAIGHT_LINE_INDEX_CAP);
  const artifact: AuditArtifact = {
    dataset,
    missingItemCodes,
    unexpectedIndicators,
    straightLineRowIndexes: cappedIndexes,
    duplicateIdValues,
    details,
  };

  return compileOk(
    "dataset-audit",
    input,
    artifact,
    findings,
    {
      rows: dataset.rowCount,
      columns: dataset.columns.length,
      items: indicatorColumns.length,
      missingCells,
      outOfBoundCells,
      duplicateIds: duplicateIdValues.length,
      straightLineRows: straightLineRowIndexes.length,
    },
    "audited",
  );
}
