import type { CellValue, Dataset } from "../core/types.js";

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

function cellToCsv(value: CellValue | undefined): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "number") {
    return String(value);
  }
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return csvEscape(safe);
}

export function emitDatasetCsv(dataset: Dataset): string {
  const header = dataset.columns.map((column) => csvEscape(column.name)).join(",");
  const lines = [header];
  for (const row of dataset.rows) {
    lines.push(dataset.columns.map((column) => cellToCsv(row[column.name])).join(","));
  }
  return `${lines.join("\n")}\n`;
}
