import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const failures = [];
function read(relativePath) {
  const absolutePath = join(root, relativePath);
  if (!existsSync(absolutePath)) { failures.push(`missing agent-contract file: ${relativePath}`); return ""; }
  return readFileSync(absolutePath, "utf8");
}

const map = read("docs/agent-verification-map.md");
const protocol = read("docs/agent-evaluation-protocol.md");
const manifestText = read("fixtures/agent-evals/manifest.json");
const agents = read("AGENTS.md");
const product = read("docs/PRODUCT_SPEC.md");
const architecture = read("docs/ARCHITECTURE.md");
const boundary = read("docs/BOUNDARY.md");
const packageJson = JSON.parse(read("package.json"));
let manifest = null;
try { manifest = JSON.parse(manifestText); } catch { failures.push("agent evaluation manifest is not valid JSON"); }

for (const text of ["docs/PRODUCT_SPEC.md", "docs/ARCHITECTURE.md", "docs/BOUNDARY.md", "docs/THREAT_MODEL.md", "npm run verify", "deterministic", "receipts", "Excel/Google Sheets"]) if (!map.includes(text)) failures.push(`verification map is missing: ${text}`);
for (const text of ["QR-01", "QR-08", "Scientific boundary", "Data safety", "10/12", "parent review"]) if (!protocol.includes(text)) failures.push(`evaluation protocol is missing: ${text}`);
for (const text of ["deterministic", "receipt", "grant thresholds"]) if (!product.toLowerCase().includes(text.toLowerCase())) failures.push(`product spec anchor is missing: ${text}`);
for (const text of ["pure", "no network", "emitters"]) if (!architecture.toLowerCase().includes(text.toLowerCase())) failures.push(`architecture anchor is missing: ${text}`);
if (!boundary.includes("Github 3") || !boundary.includes("OpenSheet-AI")) failures.push("boundary document must preserve cross-project ownership");
if (!agents.includes("npm run verify")) failures.push("AGENTS.md is missing npm run verify");

const expected = new Set(["QR-01", "QR-02", "QR-03", "QR-04", "QR-05", "QR-06", "QR-07", "QR-08"]);
if (!manifest || manifest.version !== 1 || !Array.isArray(manifest.tasks)) failures.push("agent evaluation manifest must declare version 1 and tasks");
else {
  const actual = new Set();
  for (const task of manifest.tasks) {
    if (!task || typeof task.id !== "string" || actual.has(task.id)) failures.push(`missing or duplicate task ID: ${String(task?.id)}`);
    if (typeof task?.id === "string") actual.add(task.id);
    if (!Array.isArray(task?.paths) || !task.paths.length) failures.push(`${task?.id}: paths required`);
    if (!Array.isArray(task?.commands) || !task.commands.length) failures.push(`${task?.id}: commands required`);
    if (task?.risk === "critical" && task.humanReview !== true) failures.push(`${task.id}: critical tasks require human review`);
    for (const command of task?.commands ?? []) {
      const match = /^npm run ([a-z0-9:_-]+)$/.exec(command);
      if (!match || !packageJson.scripts?.[match[1]]) failures.push(`${task?.id}: command is not a package script: ${String(command)}`);
    }
  }
  for (const id of expected) if (!actual.has(id)) failures.push(`missing task: ${id}`);
}
if (packageJson.scripts?.["check:agent-contract"] !== "node scripts/check-agent-contract.mjs") failures.push("missing check:agent-contract script");
if (packageJson.scripts?.["agent-eval"] !== "node scripts/run-agent-eval.mjs") failures.push("missing agent-eval script");
if (typeof packageJson.scripts?.verify !== "string" || !packageJson.scripts.verify.includes("check:agent-contract")) failures.push("verify must include check:agent-contract");

if (failures.length) { console.error(failures.join("\n")); process.exitCode = 1; }
else console.log("agent contract ok: map, protocol, manifest and package hooks are present");
