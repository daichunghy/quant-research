#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export const REQUIRED_SOURCE_FILES = Object.freeze([
  "package.json",
  "package-lock.json",
  "README.md",
  "LICENSE",
  "CHANGELOG.md",
  "docs/first-use.md",
  "docs/release-and-rollback.md",
  "examples/reproducibility-manifest.json",
  "examples/tam-workflow.json",
  "examples/service-quality-workflow/workflow.json",
  "scripts/research-workflow.mjs",
]);

export const REQUIRED_PACK_FILES = Object.freeze([
  "examples/reproducibility-manifest.json",
  "examples/tam-workflow.json",
  "examples/service-quality-workflow/workflow.json",
]);

const FORBIDDEN_PACK_ROOTS = new Set(["src", "test", "fixtures", "scripts"]);
const ALPHA_VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)-alpha\.(0|[1-9]\d*)(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

function normalizePath(path) {
  return String(path).replaceAll("\\", "/").replace(/^\.\//, "");
}

function asPathSet(paths) {
  return new Set(Array.from(paths ?? [], (path) => normalizePath(path)));
}

export function isValidAlphaVersion(version) {
  return typeof version === "string" && ALPHA_VERSION.test(version);
}

export function evaluateReleaseCandidate({ packageJson, sourcePaths, packPaths }) {
  const failures = [];
  const sourceSet = asPathSet(sourcePaths);
  const packSet = asPathSet(packPaths);

  if (packageJson?.private !== false) {
    failures.push("package.json must set private to false");
  }
  if (!isValidAlphaVersion(packageJson?.version)) {
    failures.push(`package.json version must be a valid alpha semver (received ${String(packageJson?.version)})`);
  }
  if (packageJson?.dependencies !== undefined && Object.keys(packageJson.dependencies ?? {}).length > 0) {
    failures.push("package.json must not add runtime dependencies to the Node-built-in contract");
  }

  for (const file of REQUIRED_SOURCE_FILES) {
    if (!sourceSet.has(file)) {
      failures.push(`missing release-candidate file: ${file}`);
    }
  }

  if (packSet.size === 0) {
    failures.push("npm pack --dry-run returned no files");
  }

  const forbidden = [...packSet]
    .filter((path) => FORBIDDEN_PACK_ROOTS.has(path.split("/")[0] ?? "") && path !== "scripts/research-workflow.mjs")
    .sort();
  for (const path of forbidden) {
    failures.push(`packed archive exposes forbidden path: ${path}`);
  }

  for (const file of REQUIRED_PACK_FILES) {
    if (!packSet.has(file)) {
      failures.push(`packed archive is missing required example: ${file}`);
    }
  }

  return {
    ok: failures.length === 0,
    failures,
    packageName: typeof packageJson?.name === "string" ? packageJson.name : null,
    version: typeof packageJson?.version === "string" ? packageJson.version : null,
    packFileCount: packSet.size,
  };
}

export function collectExistingSourceFiles(packageRoot) {
  return REQUIRED_SOURCE_FILES.filter((file) => {
    try {
      return statSync(join(packageRoot, file)).isFile();
    } catch {
      return false;
    }
  });
}

export function parsePackPaths(stdout) {
  const text = stdout.trim();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    const jsonStart = text.indexOf("[");
    if (jsonStart < 0) {
      throw new Error("npm pack --json did not return a JSON array");
    }
    payload = JSON.parse(text.slice(jsonStart));
  }

  const entry = Array.isArray(payload) ? payload[0] : payload;
  if (entry === null || typeof entry !== "object" || !Array.isArray(entry.files)) {
    throw new Error("npm pack --json returned no file list");
  }

  return entry.files
    .map((file) => (typeof file === "string" ? file : file?.path))
    .filter((path) => typeof path === "string")
    .map((path) => normalizePath(path));
}

export function runPackDryRun(packageRoot) {
  const result = spawnSync("npm", ["pack", "--dry-run", "--json", "--ignore-scripts"], {
    cwd: packageRoot,
    encoding: "utf8",
    env: { ...process.env, npm_config_offline: "true", npm_config_ignore_scripts: "true" },
    maxBuffer: 4 * 1024 * 1024,
  });

  if (result.error) {
    throw new Error(`npm pack could not start: ${result.error.message}`);
  }
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || "").trim().slice(0, 2000);
    throw new Error(`npm pack failed with status ${result.status ?? 1}${detail ? `: ${detail}` : ""}`);
  }
  return parsePackPaths(result.stdout);
}

export function runReleaseCandidate(packageRoot = root) {
  const failures = [];
  let packageJson = {};
  try {
    packageJson = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8"));
  } catch (error) {
    failures.push(`package.json could not be read as JSON: ${error instanceof Error ? error.message : String(error)}`);
  }

  let packPaths = [];
  try {
    packPaths = runPackDryRun(packageRoot);
  } catch (error) {
    failures.push(error instanceof Error ? error.message : String(error));
  }

  const evaluation = evaluateReleaseCandidate({
    packageJson,
    sourcePaths: collectExistingSourceFiles(packageRoot),
    packPaths,
  });
  return {
    ...evaluation,
    failures: [...failures, ...evaluation.failures],
    ok: failures.length === 0 && evaluation.ok,
  };
}

function main() {
  const result = runReleaseCandidate();
  if (!result.ok) {
    process.stderr.write("release-candidate gate: FAIL\n");
    process.stderr.write(`${result.failures.join("\n")}\n`);
    process.exitCode = 1;
    return;
  }

  process.stdout.write(`release-candidate gate: PASS (${result.packageName}@${result.version}, ${result.packFileCount} packed files)\n`);
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
