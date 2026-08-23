import type { Dataset } from "../core/types.js";

function spssName(name: string): string {
  return name.slice(0, 64);
}

export function emitSpssDataList(dataset: Dataset): string {
  const specs = dataset.columns.map((column) => {
    const sample = dataset.rows.find((row) => typeof row[column.name] === "string");
    if (column.role === "id" || column.role === "demographic" || sample) {
      return `${spssName(column.name)} (A24)`;
    }
    return spssName(column.name);
  });
  const lines: string[] = [
    "* AgentBiz quant-research DATA LIST. Not executed SPSS output.",
    `DATA LIST LIST / ${specs.join(" ")}.`,
    "BEGIN DATA",
  ];
  for (const row of dataset.rows) {
    const cells = dataset.columns.map((column) => {
      const value = row[column.name];
      if (value === null || value === undefined) {
        return ".";
      }
      if (typeof value === "number") {
        return String(value);
      }
      return `"${value.replaceAll('"', "'")}"`;
    });
    lines.push(cells.join(" "));
  }
  lines.push("END DATA.");
  return `${lines.join("\n")}\n`;
}
