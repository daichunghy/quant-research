import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import {
  evaluateReleaseCandidate,
  REQUIRED_PACK_FILES,
  REQUIRED_SOURCE_FILES,
  isValidAlphaVersion,
} from "../scripts/check-release-candidate.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const script = join(root, "scripts", "check-release-candidate.mjs");

function passingInput() {
  return {
    packageJson: { name: "@agentbiz/quant-research", private: false, version: "0.1.0-alpha.6" },
    sourcePaths: REQUIRED_SOURCE_FILES,
    packPaths: ["package.json", "README.md", "LICENSE", ...REQUIRED_PACK_FILES, "scripts/research-workflow.mjs", "dist/index.js"],
  };
}

describe("release-candidate gate", () => {
  it("passes the real package through the offline npm pack dry-run", () => {
    const result = spawnSync(process.execPath, [script], { cwd: root, encoding: "utf8" });
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("release-candidate gate: PASS");
    expect(result.stdout).toContain("0.1.0-alpha.6");
  });

  it("requires a public alpha package and the release input files", () => {
    const input = passingInput();
    const result = evaluateReleaseCandidate({
      ...input,
      packageJson: { ...input.packageJson, private: true, version: "0.1.0" },
      sourcePaths: REQUIRED_SOURCE_FILES.filter((file) => file !== "docs/first-use.md"),
    });

    expect(result.ok).toBe(false);
    expect(result.failures).toEqual(expect.arrayContaining([
      "package.json must set private to false",
      "package.json version must be a valid alpha semver (received 0.1.0)",
      "missing release-candidate file: docs/first-use.md",
    ]));
  });

  it("rejects accidental runtime dependency pollution", () => {
    const result = evaluateReleaseCandidate({
      ...passingInput(),
      packageJson: { ...passingInput().packageJson, dependencies: { cac: "^6.7.14" } },
    });

    expect(result.ok).toBe(false);
    expect(result.failures).toContain(
      "package.json must not add runtime dependencies to the Node-built-in contract",
    );
  });

  it("rejects forbidden packed roots and missing distributed examples", () => {
    const input = passingInput();
    const result = evaluateReleaseCandidate({
      ...input,
      packPaths: ["package.json", "src/index.ts", "test/example.test.ts", "fixtures/input.json"],
    });

    expect(result.ok).toBe(false);
    expect(result.failures).toEqual(expect.arrayContaining([
      "packed archive exposes forbidden path: fixtures/input.json",
      "packed archive exposes forbidden path: src/index.ts",
      "packed archive exposes forbidden path: test/example.test.ts",
      "packed archive is missing required example: examples/reproducibility-manifest.json",
      "packed archive is missing required example: examples/tam-workflow.json",
      "packed archive is missing required example: examples/service-quality-workflow/workflow.json",
    ]));
  });

  it("keeps the package hook in verify and validates the alpha shape", () => {
    const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as {
      scripts: Record<string, string>;
    };
    expect(packageJson.scripts["check:release-candidate"]).toBe("node scripts/check-release-candidate.mjs");
    expect(packageJson.scripts.verify).toContain("check:release-candidate");
    expect(isValidAlphaVersion("0.1.0-alpha.6")).toBe(true);
    expect(isValidAlphaVersion("0.1.0")).toBe(false);
    expect(isValidAlphaVersion("0.1.0-beta.1")).toBe(false);
  });
});
