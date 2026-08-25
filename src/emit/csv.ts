import type { CellValue, Dataset } from "../core/types.js";
import { csvEscape } from "./escape.js";

function cellToCsv(value: CellValue | undefined): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "number") {
    return String(value);
  }
  return csvEscape(value);
}

export function emitDatasetCsv(dataset: Dataset): string {
  const header = dataset.columns.map((column) => csvEscape(column.name)).join(",");
  const lines = [header];
  for (const row of dataset.rows) {
    lines.push(dataset.columns.map((column) => cellToCsv(row[column.name])).join(","));
  }
  return `${lines.join("\n")}\n`;
}
