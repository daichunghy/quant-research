#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const forbiddenRoots = new Set(["src", "test", "fixtures", "scripts"]);

function run(file, args, cwd) {
  return execFileSync(file, args, {
    cwd,
    encoding: "utf8",
    stdio: "pipe",
    env: { ...process.env, npm_config_offline: "true", npm_config_ignore_scripts: "true" },
  });
}

function fail(message) {
  throw new Error(`clean-room consumer smoke: ${message}`);
}

function packPackage(directory) {
  let payload;
  try {
    payload = JSON.parse(
      run("npm", ["pack", "--offline", "--ignore-scripts", "--json", "--pack-destination", directory], root),
    );
  } catch (error) {
    fail(`npm pack failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  const entry = Array.isArray(payload) ? payload[0] : payload;
  if (entry === null || typeof entry !== "object" || typeof entry.filename !== "string") {
    fail("npm pack returned no tarball");
  }
  const files = Array.isArray(entry.files) ? entry.files : [];
  const forbidden = files
    .map((file) => (typeof file === "string" ? file : file?.path))
    .filter((file) => typeof file === "string")
    .filter((file) => forbiddenRoots.has(file.split("/")[0] ?? "") && file !== "scripts/research-workflow.mjs");
  if (forbidden.length > 0) {
    fail(`packed forbidden paths: ${forbidden.join(", ")}`);
  }
  return isAbsolute(entry.filename) ? entry.filename : join(directory, entry.filename);
}

async function main() {
  const temporary = await mkdtemp(join(tmpdir(), "quant-research-clean-room-"));
  try {
    const tarball = packPackage(temporary);
    const consumer = join(temporary, "consumer");
    await mkdir(consumer);
    run("npm", ["init", "-y", "--silent"], consumer);
    run(
      "npm",
      ["install", "--offline", "--ignore-scripts", "--no-package-lock", "--no-save", tarball],
      consumer,
    );

    const packageRoot = join(consumer, "node_modules", "@agentbiz", "quant-research");
    const binary = join(consumer, "node_modules", ".bin", "agentbiz-quant");
    const workflowBinary = join(consumer, "node_modules", ".bin", "agentbiz-quant-workflow");
    const help = run(binary, ["--help"], consumer);
    if (!help.includes("foundation CLI")) fail("installed binary did not load the packaged CLI");
    const example = join(packageRoot, "examples", "tam-instrument.json");
    const codebook = run(binary, ["codebook", example], consumer);
    if (!codebook.includes("# Instrument codebook")) fail("installed package example could not produce a codebook");
    const workflowOutput = join(temporary, "workflow-output");
    const workflow = run(workflowBinary, ["--workflow", "service-quality", "--out", workflowOutput], consumer);
    if (!workflow.includes("statistical engine executed: false")) fail("installed workflow did not report its execution boundary");
    if (!existsSync(join(workflowOutput, "workflow-summary.md"))) fail("installed workflow did not write markdown summary");
    run(
      process.execPath,
      ["--input-type=module", "-e", "import('@agentbiz/quant-research').then(({ COMPILER_VERSION }) => { if (typeof COMPILER_VERSION !== 'string') process.exit(1); })"],
      consumer,
    );
    console.log("clean-room consumer smoke: pass (CLI, packaged workflow, shipped example, package import)");
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
