#!/usr/bin/env node

import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as ts from "typescript";

const root = fileURLToPath(new URL("..", import.meta.url));

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

function tableCells(line) {
  const cells = line.trim().split("|");
  if (cells.length < 3 || cells[0] !== "" || cells.at(-1) !== "") {
    return undefined;
  }
  return cells.slice(1, -1).map((cell) => cell.trim());
}

export function findFindingCodes(source, fileName = "source.ts") {
  const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const codes = [];

  function visit(node) {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "finding"
    ) {
      const firstArgument = node.arguments[0];
      if (
        firstArgument &&
        ts.isPropertyAccessExpression(firstArgument) &&
        ts.isIdentifier(firstArgument.expression) &&
        firstArgument.expression.text === "ERROR_CODES" &&
        ts.isIdentifier(firstArgument.name)
      ) {
        codes.push(firstArgument.name.text);
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return codes;
}

export function extractSourceLocationPaths(sourceCell) {
  return [...sourceCell.matchAll(/`(src\/[^`]+)`/g)].map(([, path]) => path);
}

async function isValidSourceLocation(projectRoot, sourcePath) {
  if (!sourcePath.startsWith("src/") || sourcePath.includes("..") || !sourcePath.endsWith(".ts")) {
    return false;
  }
  const absolutePath = join(projectRoot, sourcePath);
  if (relative(projectRoot, absolutePath) !== sourcePath) {
    return false;
  }
  try {
    return (await stat(absolutePath)).isFile();
  } catch {
    return false;
  }
}

export async function checkErrorReference(projectRoot = root) {
  const sourceRoot = join(projectRoot, "src");
  const registryPath = join(sourceRoot, "core", "errors.ts");
  const documentationPath = join(projectRoot, "docs", "ERRORS.md");
  const errors = [];

  const registrySource = await readFile(registryPath, "utf8");
  const registryMatch = registrySource.match(/export const ERROR_CODES = \{([\s\S]*?)\} as const;/);
  if (!registryMatch) {
    errors.push(`Could not find the ERROR_CODES registry in ${relative(projectRoot, registryPath)}.`);
    return { errors, registrySize: 0, emittedCount: 0 };
  }

  const registryEntries = [...registryMatch[1].matchAll(/^\s{2}([A-Za-z_][A-Za-z0-9_]*):\s*"([^"]+)",?\s*$/gm)].map(
    ([, key, value]) => ({ key, value }),
  );
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
    for (const key of findFindingCodes(source, path)) {
      const entry = registryEntries.find((candidate) => candidate.key === key);
      if (!entry) {
        errors.push(`Source emits ERROR_CODES.${key}, but it is absent from the registry.`);
        continue;
      }
      usageByCode.get(entry.value).add(relative(projectRoot, path));
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
    const sourcePaths = extractSourceLocationPaths(row.source);
    if (sourcePaths.length === 0) {
      errors.push(`docs/ERRORS.md row '${row.code}' must include at least one backticked src/*.ts source location.`);
    }
    for (const sourcePath of sourcePaths) {
      if (!(await isValidSourceLocation(projectRoot, sourcePath))) {
        errors.push(`docs/ERRORS.md row '${row.code}' references missing or invalid source path '${sourcePath}'.`);
      }
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
    if (expectedEmission === "emitted") {
      const documentedPaths = new Set(extractSourceLocationPaths(row.source));
      for (const path of usageByCode.get(code)) {
        if (!documentedPaths.has(path)) {
          errors.push(`Code '${code}' is emitted from '${path}', but docs/ERRORS.md does not list that source location.`);
        }
      }
      for (const path of documentedPaths) {
        if (!usageByCode.get(code).has(path)) {
          errors.push(`Code '${code}' lists '${path}', but no semantic finding(ERROR_CODES.<code>, ...) call site exists there.`);
        }
      }
    }
  }

  for (const code of rowsByCode.keys()) {
    if (!registryByCode.has(code)) {
      errors.push(`docs/ERRORS.md lists '${code}', but it is absent from the ERROR_CODES registry.`);
    }
  }

  return {
    errors,
    registrySize: registryByCode.size,
    emittedCount: [...usageByCode.values()].filter((paths) => paths.size > 0).length,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await checkErrorReference();
  if (result.errors.length > 0) {
    process.stderr.write(`Error reference check failed:\n${result.errors.map((message) => `- ${message}`).join("\n")}\n`);
    process.exit(1);
  }
  process.stdout.write(`error reference: pass (${result.registrySize} registry entries, ${result.emittedCount} emitted)\n`);
}
