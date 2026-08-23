import { buildDictionary } from "../instrument/index.js";
import type { Instrument } from "../core/types.js";

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

export function emitDictionaryCsv(instrument: Instrument): string {
  const rows = buildDictionary(instrument);
  const header = [
    "constructCode",
    "constructName",
    "itemCode",
    "text",
    "min",
    "max",
    "reverse",
    "status",
    "citation",
  ];
  const lines = [header.join(",")];
  for (const row of rows) {
    lines.push(
      [
        csvEscape(row.constructCode),
        csvEscape(row.constructName),
        csvEscape(row.itemCode),
        csvEscape(row.text),
        String(row.min),
        String(row.max),
        row.reverse ? "true" : "false",
        csvEscape(row.status),
        csvEscape(row.citation),
      ].join(","),
    );
  }
  return `${lines.join("\n")}\n`;
}

export function emitCodebookMarkdown(instrument: Instrument): string {
  const lines: string[] = [
    "# Instrument codebook",
    "",
    `Language: ${instrument.language}`,
    "Demonstration items are not published measurement instruments.",
    "",
  ];
  for (const construct of instrument.constructs) {
    lines.push(`## ${construct.code} — ${construct.name}`);
    lines.push("");
    lines.push(
      `Kind: ${construct.kind}. Scale ${construct.scale.min}–${construct.scale.max}. Items: ${construct.items.length}.`,
    );
    if (construct.scale.anchors) {
      lines.push(
        `Anchors: ${construct.scale.anchors.map((anchor) => `${anchor.value} = ${anchor.label}`).join("; ")}.`,
      );
    }
    lines.push("");
    lines.push("| Code | Reverse | Status | Text |");
    lines.push("| --- | --- | --- | --- |");
    for (const item of construct.items) {
      const text = item.text.replaceAll("|", "\\|");
      lines.push(`| ${item.code} | ${item.reverse ? "yes" : "no"} | ${item.status} | ${text} |`);
    }
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}
