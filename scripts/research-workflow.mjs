#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { realpathSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const cli = join(root, "dist", "cli.js");
const REQUIRED_INPUTS = ["instrument", "topicCard", "observed", "dataset", "recode", "measurement"];
const EMITTERS = new Set(["codebook", "dictionary-csv", "dataset-csv", "spss-data", "spss", "lavaan", "amos", "smartpls"]);
const DEFAULT_WORKFLOW = "tam";
const NAMED_WORKFLOWS = Object.freeze({
  tam: join(root, "examples", "tam-workflow.json"),
  "service-quality": join(root, "examples", "service-quality-workflow", "workflow.json"),
});
const NAMED_WORKFLOW_NAMES = Object.keys(NAMED_WORKFLOWS);

function usage() {
  return [
    "Usage: node scripts/research-workflow.mjs [workflow.json] [--workflow <name>] [--out <directory>]",
    "",
    "Runs a deterministic local research workflow from a workflow descriptor.",
    "The descriptor paths are relative to the descriptor; all inputs must be typed",
    "agentbiz JSON documents. The workflow emits specifications only and never runs",
    "SPSS, lavaan, AMOS, SmartPLS, or any statistical engine.",
    "",
    "Named workflows:",
    "  tam              examples/tam-workflow.json (default)",
    "  service-quality  examples/service-quality-workflow/workflow.json",
    "",
    "Example: node scripts/research-workflow.mjs --workflow service-quality --out /tmp/service-quality-workflow",
    "Default output: a new directory under the operating system temp directory.",
  ].join("\n");
}

function fail(message) {
  throw new Error(`research workflow: ${message}`);
}

function assertRecord(value, label) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    fail(`${label} must be a JSON object.`);
  }
  return value;
}

function assertString(value, label) {
  if (typeof value !== "string" || value.trim() === "") {
    fail(`${label} must be a non-empty string.`);
  }
  return value;
}

function validateDescriptor(value) {
  const descriptor = assertRecord(value, "workflow descriptor");
  if (descriptor.workflowVersion !== "agentbiz.research-workflow.v1") {
    fail("workflowVersion must equal agentbiz.research-workflow.v1.");
  }
  assertString(descriptor.name, "name");
  if (descriptor.provenance !== "demonstration") {
    fail("provenance must be demonstration; this runner does not invent citations.");
  }

  const inputs = assertRecord(descriptor.inputs, "inputs");
  for (const key of REQUIRED_INPUTS) {
    assertString(inputs[key], `inputs.${key}`);
  }

  if (!Array.isArray(descriptor.emitters) || descriptor.emitters.length === 0) {
    fail("emitters must be a non-empty array.");
  }
  const seen = new Set();
  for (const emitter of descriptor.emitters) {
    assertString(emitter, "emitters[]");
    if (!EMITTERS.has(emitter)) {
      fail(`unsupported emitter ${emitter}.`);
    }
    if (seen.has(emitter)) {
      fail(`duplicate emitter ${emitter}.`);
    }
    seen.add(emitter);
  }
  return { name: descriptor.name, provenance: descriptor.provenance, inputs, emitters: descriptor.emitters };
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function runCli(args) {
  const result = spawnSync(process.execPath, [cli, ...args], {
    cwd: root,
    encoding: "utf8",
  });
  if (result.error) {
    fail(`could not start ${args[0]}: ${result.error.message}`);
  }
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || `exit ${String(result.status)}`).trim();
    fail(`${args.join(" ")} failed: ${detail}`);
  }
  return result.stdout;
}

function runJson(args) {
  const output = runCli(args);
  try {
    return JSON.parse(output);
  } catch (error) {
    fail(`${args[0]} returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function markdownInline(value) {
  return String(value)
    .replaceAll("\\", "\\\\")
    .replaceAll("`", "\\`")
    .replaceAll("|", "\\|")
    .replaceAll("\r", " ")
    .replaceAll("\n", " ");
}

function renderWorkflowSummary(summary) {
  const artifactFilenames = Object.values(summary.outputs);
  const emitterFilenames = Object.values(summary.emitters);
  return [
    "# Research workflow summary",
    "",
    `- Workflow name: \`${markdownInline(summary.name)}\``,
    `- Provenance: \`${markdownInline(summary.provenance)}\``,
    `- Workflow version: \`${markdownInline(summary.workflowVersion)}\``,
    "",
    "## Six step statuses",
    "",
    "| Step | Status |",
    "| --- | --- |",
    ...summary.steps.map(({ id, status }) => `| \`${markdownInline(id)}\` | \`${markdownInline(status)}\` |`),
    "",
    "## Invariants",
    "",
    `- Rows: raw \`${summary.invariants.rawRows}\`, audited \`${summary.invariants.auditedRows}\`, recoded \`${summary.invariants.recodedRows}\`; rows preserved: \`${summary.invariants.rowsPreserved}\`.`,
    `- Raw columns: \`${summary.invariants.rawColumns}\`; recoded columns: \`${summary.invariants.recodedColumns}\`; raw columns preserved: \`${summary.invariants.rawColumnsPreserved}\`.`,
    "- No statistical engine executed.",
    "",
    "## Emitted filenames",
    "",
    "### Workflow artifacts",
    "",
    ...artifactFilenames.map((filename) => `- \`${markdownInline(filename)}\``),
    "",
    "### Emitter outputs",
    "",
    ...emitterFilenames.map((filename) => `- \`${markdownInline(filename)}\``),
    "",
    "### Summary files",
    "",
    "- `workflow-summary.json`",
    "- `workflow-summary.md`",
    "",
  ].join("\n");
}

function pathFromDescriptor(descriptorPath, value) {
  return isAbsolute(value) ? value : resolve(dirname(descriptorPath), value);
}

function relativeInputPath(descriptorPath, inputPath) {
  const value = relative(dirname(descriptorPath), inputPath);
  return value.startsWith(".") ? value : `./${value}`;
}

function parseArguments(args) {
  let workflowPath = NAMED_WORKFLOWS[DEFAULT_WORKFLOW];
  let workflowMode = DEFAULT_WORKFLOW;
  let outputDirectory;
  let hasNamedWorkflow = false;
  let hasDescriptor = false;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--out") {
      const value = args[index + 1];
      if (!value) {
        fail("--out requires a directory.");
      }
      outputDirectory = resolve(value);
      index += 1;
    } else if (arg === "--workflow") {
      const value = args[index + 1];
      if (!value || value.startsWith("--")) {
        fail("--workflow requires a name.");
      }
      if (hasNamedWorkflow || hasDescriptor) {
        fail("provide only one named workflow or workflow descriptor.");
      }
      if (!Object.hasOwn(NAMED_WORKFLOWS, value)) {
        fail(`unknown workflow ${value}; choose ${NAMED_WORKFLOW_NAMES.join(", ")}.`);
      }
      workflowPath = NAMED_WORKFLOWS[value];
      workflowMode = value;
      hasNamedWorkflow = true;
      index += 1;
    } else if (arg.startsWith("--")) {
      fail(`unknown option ${arg}.`);
    } else {
      if (hasNamedWorkflow || hasDescriptor) {
        fail("provide only one named workflow or workflow descriptor.");
      }
      workflowPath = arg;
      workflowMode = "descriptor";
      hasDescriptor = true;
    }
  }

  return { workflowPath, workflowMode, outputDirectory };
}

function countStatuses(rows) {
  return rows.reduce((counts, row) => {
    counts[row.status] = (counts[row.status] ?? 0) + 1;
    return counts;
  }, {});
}

function requireArtifact(payload, label) {
  if (payload === null || typeof payload !== "object" || payload.artifact === undefined || payload.receipt === undefined) {
    fail(`${label} did not return an artifact and receipt.`);
  }
  return payload;
}

function requireRows(payload, label) {
  if (!payload.artifact || !Array.isArray(payload.artifact.rows)) {
    fail(`${label} artifact does not contain rows.`);
  }
  return payload.artifact.rows;
}

async function runWorkflow(workflowPath, outputDirectory) {
  const descriptorPath = resolve(workflowPath);
  const descriptor = validateDescriptor(await readJson(descriptorPath));
  await mkdir(outputDirectory, { recursive: true });

  const input = Object.fromEntries(
    REQUIRED_INPUTS.map((key) => [key, pathFromDescriptor(descriptorPath, descriptor.inputs[key])]),
  );
  const instrument = requireArtifact(runJson(["compile", input.instrument]), "instrument compile");
  const topicCard = requireArtifact(
    runJson(["compile", input.topicCard, "--instrument", input.instrument]),
    "topic-card compile",
  );
  const gapMap = requireArtifact(runJson(["gap", input.instrument, input.observed]), "gap map");
  const audit = requireArtifact(runJson(["audit", input.instrument, input.dataset]), "dataset audit");
  const recode = requireArtifact(runJson(["recode", input.instrument, input.dataset, input.recode]), "recode");
  const measurement = requireArtifact(
    runJson([
      "compile",
      input.measurement,
      "--instrument",
      input.instrument,
      "--topic-card",
      input.topicCard,
    ]),
    "measurement compile",
  );

  const rawDataset = await readJson(input.dataset);
  const auditDataset = audit.artifact.dataset;
  if (!auditDataset || !Array.isArray(auditDataset.rows)) {
    fail("dataset audit artifact does not contain dataset rows.");
  }
  const auditRows = auditDataset.rows;
  const recodedRows = requireRows(recode, "recode");
  if (auditRows.length !== rawDataset.rows.length || recodedRows.length !== rawDataset.rows.length) {
    fail("dataset audit or recode changed the number of rows.");
  }
  const rawColumnNames = rawDataset.columns.map((column) => column.name);
  const recodedColumnNames = recode.artifact.columns.map((column) => column.name);
  if (!rawColumnNames.every((name) => recodedColumnNames.includes(name))) {
    fail("recode output is missing a raw dataset column.");
  }

  const bundle = {
    instrument: instrument.artifact.instrument,
    topicCard: topicCard.artifact,
    measurement: measurement.artifact,
  };

  const jsonArtifacts = [
    ["instrument.json", instrument],
    ["topic-card.json", topicCard],
    ["gap-map.json", gapMap],
    ["dataset-audit.json", audit],
    ["recode.json", recode],
    ["measurement.json", measurement],
    ["bundle.json", bundle],
  ];
  for (const [name, value] of jsonArtifacts) {
    await writeJson(join(outputDirectory, name), value);
  }

  const emitterOutputs = {};
  for (const emitter of descriptor.emitters) {
    const [args, filename, format] = {
      codebook: [["codebook", input.instrument], "codebook.md", "text"],
      "dictionary-csv": [["dictionary-csv", input.instrument], "dictionary.csv", "text"],
      "dataset-csv": [["csv", input.dataset], "dataset.csv", "text"],
      "spss-data": [["emit-spss-data", input.dataset], "spss-data.sps", "text"],
      spss: [["emit-spss", join(outputDirectory, "bundle.json")], "spss.sps", "text"],
      lavaan: [["emit-lavaan", join(outputDirectory, "bundle.json")], "lavaan.R", "text"],
      amos: [["emit-amos", join(outputDirectory, "bundle.json")], "amos.json", "json"],
      smartpls: [["emit-smartpls", join(outputDirectory, "bundle.json")], "smartpls.json", "json"],
    }[emitter];
    const output = runCli(args);
    if (format === "json") {
      await writeJson(join(outputDirectory, filename), JSON.parse(output));
    } else {
      await writeFile(join(outputDirectory, filename), output, "utf8");
    }
    emitterOutputs[emitter] = filename;
  }

  const summary = {
    workflowVersion: "agentbiz.research-workflow.v1",
    name: descriptor.name,
    provenance: descriptor.provenance,
    inputs: Object.fromEntries(
      REQUIRED_INPUTS.map((key) => [key, relativeInputPath(descriptorPath, input[key])]),
    ),
    steps: [
      { id: "instrument", status: instrument.receipt.status, artifactDigest: instrument.receipt.artifactDigest, counts: instrument.receipt.counts },
      { id: "topic-card", status: topicCard.receipt.status, artifactDigest: topicCard.receipt.artifactDigest, counts: topicCard.receipt.counts },
      { id: "gap-map", status: gapMap.receipt.status, artifactDigest: gapMap.receipt.artifactDigest, counts: gapMap.receipt.counts, statusCounts: countStatuses(gapMap.artifact.rows) },
      { id: "dataset-audit", status: audit.receipt.status, artifactDigest: audit.receipt.artifactDigest, counts: audit.receipt.counts },
      { id: "recode", status: recode.receipt.status, artifactDigest: recode.receipt.artifactDigest, counts: recode.receipt.counts },
      { id: "measurement", status: measurement.receipt.status, artifactDigest: measurement.receipt.artifactDigest, counts: measurement.receipt.counts },
    ],
    invariants: {
      rawRows: rawDataset.rows.length,
      auditedRows: auditRows.length,
      recodedRows: recodedRows.length,
      rawColumns: rawColumnNames.length,
      recodedColumns: recodedColumnNames.length,
      rowsPreserved: true,
      rawColumnsPreserved: true,
      statisticalEngineExecuted: false,
    },
    emitters: emitterOutputs,
    outputs: Object.fromEntries(jsonArtifacts.map(([name]) => [name.replace(/\.json$/, ""), name])),
  };
  await writeJson(join(outputDirectory, "workflow-summary.json"), summary);
  await writeFile(join(outputDirectory, "workflow-summary.md"), renderWorkflowSummary(summary), "utf8");
  return summary;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    console.log(usage());
    return;
  }

  const selection = parseArguments(args);
  let { outputDirectory } = selection;

  if (!outputDirectory) {
    const { mkdtemp } = await import("node:fs/promises");
    const { tmpdir } = await import("node:os");
    outputDirectory = await mkdtemp(join(tmpdir(), "agentbiz-quant-workflow-"));
  }
  const summary = await runWorkflow(selection.workflowPath, outputDirectory);
  console.log(`research workflow complete: ${outputDirectory}`);
  console.log(`workflow: ${selection.workflowMode} (${summary.provenance})`);
  console.log(
    `rows preserved: raw ${summary.invariants.rawRows}, audited ${summary.invariants.auditedRows}, recoded ${summary.invariants.recodedRows}; raw columns preserved: ${summary.invariants.rawColumnsPreserved}`,
  );
  console.log(`emitters: ${Object.keys(summary.emitters).join(", ")}`);
  console.log(`statistical engine executed: ${summary.invariants.statisticalEngineExecuted}`);
}

function wasExecutedDirectly() {
  if (process.argv[1] === undefined) {
    return false;
  }
  try {
    return realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
  } catch {
    return import.meta.url === pathToFileURL(process.argv[1]).href;
  }
}

if (wasExecutedDirectly()) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

export { runWorkflow, validateDescriptor };
