#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const result = spawnSync("npm", ["pack", "--dry-run", "--json"], {
  cwd: root,
  encoding: "utf8",
});

if (result.status !== 0) {
  process.stderr.write(result.stderr || result.stdout || "npm pack failed\n");
  process.exit(1);
}

const jsonStart = result.stdout.indexOf("[");
const jsonText = jsonStart >= 0 ? result.stdout.slice(jsonStart) : result.stdout;
const payload = JSON.parse(jsonText);
const files = (Array.isArray(payload) ? payload[0]?.files : payload?.files) ?? [];
const paths = files.map((file) => file.path ?? file).sort();

if (paths.length === 0) {
  process.stderr.write("npm pack --json returned no files.\n");
  process.exit(1);
}

const allowed = /^(package\.json|LICENSE|README\.md|dist\/|schemas\/|examples\/)/;
const forbidden = paths.filter((path) => !allowed.test(path));
if (forbidden.length > 0) {
  process.stderr.write(`Packed unexpected files:\n${forbidden.join("\n")}\n`);
  process.exit(1);
}

const required = [
  "package.json",
  "LICENSE",
  "README.md",
  "dist/index.js",
  "dist/cli.js",
  "dist/mcp.js",
  "dist/tools/index.js",
  "dist/tools/execute.js",
  "schemas/instrument.v1.schema.json",
  "schemas/topic-card.v1.schema.json",
  "schemas/gap-map.v1.schema.json",
  "schemas/dataset.v1.schema.json",
  "schemas/recode.v1.schema.json",
  "schemas/measurement.v1.schema.json",
  "schemas/receipt.v1.schema.json",
  "examples/tam-instrument.json",
  "examples/tam-bundle.json",
  "examples/workflow-readiness-instrument.json",
  "examples/workflow-readiness-bundle.json",
  "examples/workflow-readiness-topic-card.json",
  "examples/workflow-readiness-measurement.json",
  "examples/workflow-readiness-recode.json",
  "examples/workflow-readiness-dataset.json",
  "examples/workflow-readiness-observed.json",
];
const missing = required.filter((path) => !paths.includes(path));
if (missing.length > 0) {
  process.stderr.write(`Packed archive missing required files:\n${missing.join("\n")}\n`);
  process.exit(1);
}

process.stdout.write(`${JSON.stringify({ fileCount: paths.length, files: paths }, null, 2)}\n`);
