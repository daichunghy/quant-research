#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("..", import.meta.url));
const cli = join(root, "dist/cli.js");

function run(args) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: root,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout || `cli failed: ${args.join(" ")}\n`);
    process.exit(result.status ?? 1);
  }
  return result.stdout;
}

const compiled = JSON.parse(run(["compile", "examples/tam-instrument.json"]));
if (compiled.receipt?.status !== "compiled" || compiled.artifact?.dictionary?.length !== 9) {
  process.stderr.write("compile did not return a 9-item instrument artifact\n");
  process.exit(1);
}

const gap = JSON.parse(run(["gap", "examples/tam-instrument.json", "examples/tam-observed.json"]));
if (!gap.artifact?.rows?.every((row) => row.status === "covered")) {
  process.stderr.write("gap map should mark the TAM example as covered\n");
  process.exit(1);
}

const audit = JSON.parse(run(["audit", "examples/tam-instrument.json", "examples/tam-dataset.json"]));
if (audit.receipt?.status !== "audited" || audit.receipt?.counts?.straightLineRows !== 1) {
  process.stderr.write("audit should flag the straight-line demonstration row\n");
  process.exit(1);
}

const lavaan = run(["emit-lavaan", "examples/tam-bundle.json"]);
if (!lavaan.includes("PU =~ PU1 + PU2 + PU3") || !lavaan.includes("not a fitted model")) {
  process.stderr.write("emit-lavaan missing measurement spec markers\n");
  process.exit(1);
}

const spss = run(["emit-spss", "examples/tam-bundle.json"]);
if (!spss.includes("RELIABILITY") || !spss.includes("INTO PU3_R")) {
  process.stderr.write("emit-spss missing labels or reverse recode\n");
  process.exit(1);
}

const codebook = run(["codebook", "examples/tam-instrument.json"]);
if (!codebook.includes("PU1") || !codebook.includes("Demonstration items")) {
  process.stderr.write("codebook missing TAM items\n");
  process.exit(1);
}

const autoRecode = JSON.parse(run(["recode", "examples/tam-instrument.json", "examples/tam-dataset.json"]));
if (autoRecode.artifact?.rows?.[0]?.STRAIGHT !== 1 || typeof autoRecode.artifact?.rows?.[0]?.PU_MEAN !== "number") {
  process.stderr.write("auto recode should add STRAIGHT and PU_MEAN\n");
  process.exit(1);
}

process.stdout.write("cli smoke: pass\n");
