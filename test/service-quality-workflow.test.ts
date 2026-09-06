import { readFile, readdir, rm, mkdtemp } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("..", import.meta.url));
const script = join(root, "scripts", "research-workflow.mjs");
const workflow = join(root, "examples", "service-quality-workflow", "workflow.json");

interface WorkflowSummary {
  readonly provenance: string;
  readonly steps: readonly { readonly id: string; readonly status: string }[];
  readonly invariants: {
    readonly rawRows: number;
    readonly auditedRows: number;
    readonly recodedRows: number;
    readonly rawColumns: number;
    readonly recodedColumns: number;
    readonly rowsPreserved: boolean;
    readonly rawColumnsPreserved: boolean;
    readonly statisticalEngineExecuted: boolean;
  };
  readonly emitters: Readonly<Record<string, string>>;
}

async function runWorkflow(outputDirectory: string): Promise<WorkflowSummary> {
  const result = spawnSync(process.execPath, [script, workflow, "--out", outputDirectory], {
    cwd: root,
    encoding: "utf8",
  });
  expect(result.status, result.stderr || result.stdout).toBe(0);
  expect(result.stdout).toContain("statistical engine executed: false");
  return JSON.parse(await readFile(join(outputDirectory, "workflow-summary.json"), "utf8")) as WorkflowSummary;
}

async function outputFiles(directory: string): Promise<ReadonlyMap<string, string>> {
  const names = await readdir(directory);
  const values = await Promise.all(
    names.map(async (name) => [name, await readFile(join(directory, name), "utf8")] as const),
  );
  return new Map(values);
}

describe("service-quality research workflow example", () => {
  it("lists the named mode in help and runs it with a concise truthful summary", async () => {
    const help = spawnSync(process.execPath, [script, "--help"], {
      cwd: root,
      encoding: "utf8",
    });
    expect(help.status, help.stderr || help.stdout).toBe(0);
    expect(help.stdout).toContain("--workflow <name>");
    expect(help.stdout).toContain("service-quality");
    expect(help.stdout).toContain("never runs");

    const outputDirectory = await mkdtemp(join(tmpdir(), "agentbiz-quant-service-quality-named-test-"));
    try {
      const result = spawnSync(process.execPath, [script, "--workflow", "service-quality", "--out", outputDirectory], {
        cwd: root,
        encoding: "utf8",
      });

      expect(result.status, result.stderr || result.stdout).toBe(0);
      expect(result.stdout).toContain("workflow: service-quality (demonstration)");
      expect(result.stdout).toContain("rows preserved: raw 6, audited 6, recoded 6; raw columns preserved: true");
      expect(result.stdout).toContain("statistical engine executed: false");

      const summary = JSON.parse(await readFile(join(outputDirectory, "workflow-summary.json"), "utf8")) as WorkflowSummary;
      expect(summary.provenance).toBe("demonstration");
      expect(summary.invariants).toMatchObject({
        rawRows: 6,
        auditedRows: 6,
        recodedRows: 6,
        rowsPreserved: true,
        rawColumnsPreserved: true,
        statisticalEngineExecuted: false,
      });
    } finally {
      await rm(outputDirectory, { recursive: true, force: true });
    }
  });

  it("runs all steps deterministically while preserving data and raw text outputs", async () => {
    const first = await mkdtemp(join(tmpdir(), "agentbiz-quant-service-quality-test-"));
    const second = await mkdtemp(join(tmpdir(), "agentbiz-quant-service-quality-test-"));
    try {
      const firstSummary = await runWorkflow(first);
      const secondSummary = await runWorkflow(second);

      expect(firstSummary).toEqual(secondSummary);
      expect(firstSummary.provenance).toBe("demonstration");
      expect(firstSummary.steps.map(({ id, status }) => ({ id, status }))).toEqual([
        { id: "instrument", status: "compiled" },
        { id: "topic-card", status: "compiled" },
        { id: "gap-map", status: "compiled" },
        { id: "dataset-audit", status: "audited" },
        { id: "recode", status: "compiled" },
        { id: "measurement", status: "compiled" },
      ]);
      expect(firstSummary.invariants).toEqual({
        rawRows: 6,
        auditedRows: 6,
        recodedRows: 6,
        rawColumns: 11,
        recodedColumns: 17,
        rowsPreserved: true,
        rawColumnsPreserved: true,
        statisticalEngineExecuted: false,
      });
      expect(Object.keys(firstSummary.emitters)).toEqual([
        "codebook",
        "dictionary-csv",
        "dataset-csv",
        "spss-data",
        "spss",
        "lavaan",
        "amos",
        "smartpls",
      ]);

      const firstFiles = await outputFiles(first);
      const secondFiles = await outputFiles(second);
      expect([...firstFiles.entries()]).toEqual([...secondFiles.entries()]);
      const markdown = firstFiles.get("workflow-summary.md");
      expect(markdown).toBeDefined();
      expect(markdown).toContain("# Research workflow summary");
      expect(markdown).toContain("## Six step statuses");
      expect(markdown).toContain("| `dataset-audit` | `audited` |");
      expect(markdown).toContain("Rows: raw `6`, audited `6`, recoded `6`");
      expect(markdown).toContain("Raw columns: `11`; recoded columns: `17`");
      expect(markdown).toContain("No statistical engine executed.");
      expect(markdown).toContain("`smartpls.json`");
      for (const name of ["codebook.md", "dictionary.csv", "dataset.csv", "spss-data.sps", "spss.sps", "lavaan.R"]) {
        const output = firstFiles.get(name);
        expect(output).toBeDefined();
        expect(output).toContain("\n");
        expect(output).not.toContain("\\n");
        expect(output).not.toContain('\\"');
      }
    } finally {
      await Promise.all([
        rm(first, { recursive: true, force: true }),
        rm(second, { recursive: true, force: true }),
      ]);
    }
  });
});
