import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("..", import.meta.url));
const script = join(root, "scripts", "first-use.mjs");

describe("first-use complete workflow", () => {
  it("exits successfully, prints a complete summary, and preserves rows", () => {
    const result = spawnSync(process.execPath, [script], {
      cwd: root,
      encoding: "utf8",
    });

    expect(result.status, result.stderr || result.stdout).toBe(0);
    expect(result.stdout).toContain("first-use path passed: deterministic research artifacts were emitted from the demonstration fixtures");
    expect(result.stdout).toContain("== complete research workflow ==");
    expect(result.stdout).not.toContain('"artifact":');

    const summaryLine = result.stdout.split(/\r?\n/).find((line) => line.startsWith("workflow summary: "));
    expect(summaryLine).toBeDefined();
    const summary = JSON.parse(summaryLine?.slice("workflow summary: ".length) ?? "null") as {
      workflowVersion: string;
      steps: { id: string; status: string }[];
      rows: { raw: number; audited: number; recoded: number };
      rowsPreserved: boolean;
      rawColumnsPreserved: boolean;
      statisticalEngineExecuted: boolean;
      emitters: string[];
    };

    expect(summary.workflowVersion).toBe("agentbiz.research-workflow.v1");
    expect(summary.steps.map((step) => step.id)).toEqual([
      "instrument",
      "topic-card",
      "gap-map",
      "dataset-audit",
      "recode",
      "measurement",
    ]);
    expect(summary.rows).toEqual({ raw: 12, audited: 12, recoded: 12 });
    expect(summary.rowsPreserved).toBe(true);
    expect(summary.rawColumnsPreserved).toBe(true);
    expect(summary.statisticalEngineExecuted).toBe(false);
    expect(summary.emitters).toEqual([
      "codebook",
      "dictionary-csv",
      "dataset-csv",
      "spss-data",
      "spss",
      "lavaan",
      "amos",
      "smartpls",
    ]);

    expect(result.stdout).toContain("research workflow complete: temporary artifacts validated and removed");
  });
});
