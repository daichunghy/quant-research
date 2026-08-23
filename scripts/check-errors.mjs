#!/usr/bin/env node

import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const sourceRoot = join(root, "src");
const registryPath = join(sourceRoot, "core", "errors.ts");
const documentationPath = join(root, "docs", "ERRORS.md");

async function listSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listSourceFiles(path)));
    } else if (entry.name.endsWith(".ts")) {
      files.push(path);
    }
  }
  return files;
}

function fail(messages) {
  process.stderr.write(`Error reference check failed:\n${messages.map((message) => `- ${message}`).join("\n")}\n`);
  process.exit(1);
}

function tableCells(line) {
  const cells = line.trim().split("|");
  if (cells.length < 3 || cells[0] !== "" || cells.at(-1) !== "") {
    return undefined;
  }
  return cells.slice(1, -1).map((cell) => cell.trim());
}

const registrySource = await readFile(registryPath, "utf8");
const registryMatch = registrySource.match(/export const ERROR_CODES = \{([\s\S]*?)\} as const;/);
if (!registryMatch) {
  fail([`Could not find the ERROR_CODES registry in ${relative(root, registryPath)}.`]);
}

const registryEntries = [...registryMatch[1].matchAll(/^\s{2}([A-Za-z_][A-Za-z0-9_]*):\s*"([^"]+)",?\s*$/gm)].map(
  ([, key, value]) => ({ key, value }),
);
const errors = [];
const registryByCode = new Map();
for (const entry of registryEntries) {
  if (registryByCode.has(entry.value)) {
    errors.push(`Duplicate ERROR_CODES value '${entry.value}'.`);
  }
  registryByCode.set(entry.value, entry);
}
if (registryEntries.length === 0) {
  errors.push("ERROR_CODES registry contains no parseable entries.");
}

const usageByCode = new Map([...registryByCode.keys()].map((code) => [code, new Set()]));
for (const path of await listSourceFiles(sourceRoot)) {
  const source = await readFile(path, "utf8");
  for (const match of source.matchAll(/ERROR_CODES\.([A-Za-z_][A-Za-z0-9_]*)/g)) {
    const key = match[1];
    const entry = registryEntries.find((candidate) => candidate.key === key);
    if (!entry) {
      errors.push(`Source references ERROR_CODES.${key}, but it is absent from the registry.`);
      continue;
    }
    usageByCode.get(entry.value).add(relative(root, path));
  }
}

const documentation = await readFile(documentationPath, "utf8");
const lines = documentation.split(/\r?\n/);
const header = "| Code | Emission | Source locations | Cause | Smallest input fix |";
const headerIndex = lines.indexOf(header);
if (headerIndex === -1 || lines[headerIndex + 1] !== "| --- | --- | --- | --- | --- |") {
  errors.push("docs/ERRORS.md must contain the expected five-column error table.");
}

const rows = [];
if (headerIndex !== -1) {
  for (const line of lines.slice(headerIndex + 2)) {
    if (!line.startsWith("|")) {
      if (rows.length > 0) {
        break;
      }
      continue;
    }
    const cells = tableCells(line);
    if (!cells || cells.length !== 5) {
      errors.push(`Malformed error table row: ${line}`);
      continue;
    }
    rows.push({
      code: cells[0].replaceAll("`", ""),
      emission: cells[1],
      source: cells[2],
      cause: cells[3],
      fix: cells[4],
    });
  }
}

const rowsByCode = new Map();
for (const row of rows) {
  if (rowsByCode.has(row.code)) {
    errors.push(`docs/ERRORS.md lists '${row.code}' more than once.`);
  }
  rowsByCode.set(row.code, row);
  if (!row.source || !row.cause || !row.fix) {
    errors.push(`docs/ERRORS.md row '${row.code}' must include source, cause, and smallest input fix.`);
  }
}

for (const code of registryByCode.keys()) {
  const row = rowsByCode.get(code);
  if (!row) {
    errors.push(`docs/ERRORS.md is missing registry code '${code}'.`);
    continue;
  }
  const expectedEmission = usageByCode.get(code).size > 0 ? "emitted" : "defined but not emitted";
  if (row.emission !== expectedEmission) {
    errors.push(`Code '${code}' is marked '${row.emission}', expected '${expectedEmission}'.`);
  }
}
for (const code of rowsByCode.keys()) {
  if (!registryByCode.has(code)) {
    errors.push(`docs/ERRORS.md lists '${code}', but it is absent from the ERROR_CODES registry.`);
  }
}

if (errors.length > 0) {
  fail(errors);
}

const emittedCount = [...usageByCode.values()].filter((paths) => paths.size > 0).length;
process.stdout.write(`error reference: pass (${registryByCode.size} registry entries, ${emittedCount} emitted)\n`);
