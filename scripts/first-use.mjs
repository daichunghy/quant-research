import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const workflowScript = join(root, "scripts", "research-workflow.mjs");
const workflowDescriptor = join(root, "examples", "tam-workflow.json");
const workflowStepIds = ["instrument", "topic-card", "gap-map", "dataset-audit", "recode", "measurement"];
const workflowEmitterIds = ["codebook", "dictionary-csv", "dataset-csv", "spss-data", "spss", "lavaan", "amos", "smartpls"];

const commands = [
  ["compile instrument", ["dist/cli.js", "compile", "examples/tam-instrument.json"]],
  ["emit codebook", ["dist/cli.js", "codebook", "examples/tam-instrument.json"]],
  ["recode dataset", ["dist/cli.js", "recode", "examples/tam-instrument.json", "examples/tam-dataset.json"]],
  ["check coverage", ["dist/cli.js", "gap", "examples/tam-instrument.json", "examples/tam-observed.json"]],
  ["emit lavaan", ["dist/cli.js", "emit-lavaan", "examples/tam-bundle.json"]],
  ["emit SPSS", ["dist/cli.js", "emit-spss", "examples/tam-bundle.json"]],
];

function runCommand(label, args, options = { stdio: "inherit" }) {
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 2 * 1024 * 1024,
    ...options,
    stdio: "pipe",
  });
  if (result.error) {
    throw new Error(`${label} failed to start: ${result.error.message}`);
  }
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || "").trim().slice(0, 4000);
    throw new Error(`${label} exited with status ${result.status ?? 1}${detail ? `: ${detail}` : ""}`);
  }
  return result.stdout;
}

async function readAndCheckWorkflowSummary(outputDirectory) {
  let summary;
  try {
    summary = JSON.parse(await readFile(join(outputDirectory, "workflow-summary.json"), "utf8"));
  } catch (error) {
    throw new Error(`workflow summary could not be read: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (summary === null || typeof summary !== "object") {
    throw new Error("workflow summary is not a JSON object.");
  }
  const steps = summary.steps;
  if (!Array.isArray(steps) || steps.map((step) => step?.id).join("|") !== workflowStepIds.join("|")) {
    throw new Error(`workflow summary has an unexpected step sequence; expected ${workflowStepIds.join(" -> ")}.`);
  }

  const invariants = summary.invariants;
  if (
    invariants === null ||
    typeof invariants !== "object" ||
    invariants.rowsPreserved !== true ||
    invariants.rawRows !== invariants.auditedRows ||
    invariants.rawRows !== invariants.recodedRows ||
    invariants.rawColumnsPreserved !== true ||
    invariants.statisticalEngineExecuted !== false
  ) {
    throw new Error("workflow summary failed row-preservation or local-only invariants.");
  }

  const emitters = summary.emitters;
  if (emitters === null || typeof emitters !== "object" || Object.keys(emitters).join("|") !== workflowEmitterIds.join("|")) {
    throw new Error(`workflow summary has an unexpected emitter set; expected ${workflowEmitterIds.join(", ")}.`);
  }
  return summary;
}

async function runCompleteWorkflow() {
  const outputDirectory = await mkdtemp(join(tmpdir(), "agentbiz-quant-first-use-"));
  try {
    console.log("\n== complete research workflow ==");
    runCommand("complete research workflow", [workflowScript, workflowDescriptor, "--out", outputDirectory]);
    const summary = await readAndCheckWorkflowSummary(outputDirectory);
    console.log(`workflow summary: ${JSON.stringify({
      workflowVersion: summary.workflowVersion,
      steps: summary.steps.map(({ id, status }) => ({ id, status })),
      rows: {
        raw: summary.invariants.rawRows,
        audited: summary.invariants.auditedRows,
        recoded: summary.invariants.recodedRows,
      },
      rowsPreserved: summary.invariants.rowsPreserved,
      rawColumnsPreserved: summary.invariants.rawColumnsPreserved,
      statisticalEngineExecuted: summary.invariants.statisticalEngineExecuted,
      emitters: Object.keys(summary.emitters),
    })}`);
    console.log("research workflow complete: temporary artifacts validated and removed");
  } finally {
    await rm(outputDirectory, { recursive: true, force: true });
  }
}

async function main() {
  for (const [label, args] of commands) {
    console.log(`\n== ${label} ==`);
    runCommand(label, args);
  }

  await runCompleteWorkflow();
  console.log("\nfirst-use path passed: deterministic research artifacts were emitted from the demonstration fixtures");
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
