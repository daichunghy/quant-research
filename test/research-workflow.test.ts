import { readFile, readdir } from "node:fs/promises";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("..", import.meta.url));
const script = join(root, "scripts", "research-workflow.mjs");
const workflow = join(root, "examples", "tam-workflow.json");

async function run(outputDirectory: string): Promise<Record<string, unknown>> {
  const result = spawnSync(process.execPath, [script, workflow, "--out", outputDirectory], {
    cwd: root,
    encoding: "utf8",
  });
  expect(result.status, result.stderr || result.stdout).toBe(0);
  return JSON.parse(await readFile(join(outputDirectory, "workflow-summary.json"), "utf8")) as Record<string, unknown>;
}

async function files(directory: string): Promise<Map<string, string>> {
  const names = await readdir(directory);
  const values = await Promise.all(
    names.map(async (name) => [name, await readFile(join(directory, name), "utf8")] as const),
  );
  return new Map(values);
}

describe("research workflow example", () => {
  it("replays the complete typed workflow without dropping rows or claiming statistics", async () => {
    const first = await mkdtemp(join(tmpdir(), "agentbiz-quant-workflow-test-"));
    const second = await mkdtemp(join(tmpdir(), "agentbiz-quant-workflow-test-"));
    const firstSummary = await run(first);
    const secondSummary = await run(second);

    expect(firstSummary).toEqual(secondSummary);
    expect(firstSummary.provenance).toBe("demonstration");
    expect(firstSummary.invariants).toEqual({
      rawRows: 12,
      auditedRows: 12,
      recodedRows: 12,
      rawColumns: 11,
      recodedColumns: 14,
      rowsPreserved: true,
      rawColumnsPreserved: true,
      statisticalEngineExecuted: false,
    });
    expect(firstSummary.steps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "instrument", status: "compiled" }),
        expect.objectContaining({ id: "topic-card", status: "compiled" }),
        expect.objectContaining({ id: "gap-map", status: "compiled" }),
        expect.objectContaining({ id: "dataset-audit", status: "audited" }),
        expect.objectContaining({ id: "recode", status: "compiled" }),
        expect.objectContaining({ id: "measurement", status: "compiled" }),
      ]),
    );

    const output = await files(first);
    expect(output.has("workflow-summary.json")).toBe(true);
    const markdown = output.get("workflow-summary.md");
    expect(markdown).toBeDefined();
    expect(markdown).toContain("# Research workflow summary");
    expect(markdown).toContain("## Six step statuses");
    expect(markdown).toContain("| `instrument` | `compiled` |");
    expect(markdown).toContain("| `measurement` | `compiled` |");
    expect(markdown).toContain("Rows: raw `12`, audited `12`, recoded `12`; rows preserved: `true`.");
    expect(markdown).toContain("Raw columns: `11`; recoded columns: `14`; raw columns preserved: `true`.");
    expect(markdown).toContain("- No statistical engine executed.");
    expect(markdown).toContain("- `workflow-summary.json`");
    expect(markdown).toContain("- `workflow-summary.md`");
    expect(markdown).toContain("- `instrument.json`");
    expect(markdown).toContain("- `smartpls.json`");
    expect(output.get("codebook.md")).toContain("Demonstration items are not published");
    expect(output.get("lavaan.R")).toContain("not a fitted model");
    expect(output.get("spss.sps")).toContain("does not contain estimated results");
    expect(output.get("amos.json")).toContain("No estimator was executed");
    expect(output.get("smartpls.json")).toContain("No estimator was executed");

    const secondOutput = await files(second);
    expect(output.get("workflow-summary.md")).toBe(secondOutput.get("workflow-summary.md"));
    expect([...output.entries()]).toEqual([...secondOutput.entries()]);
  });

  it("rejects a descriptor that tries to relabel a demonstration workflow", async () => {
    const { validateDescriptor } = await import("../scripts/research-workflow.mjs");
    expect(() => validateDescriptor({
      workflowVersion: "agentbiz.research-workflow.v1",
      name: "unverified scale",
      provenance: "cited",
      inputs: {
        instrument: "tam-instrument.json",
        topicCard: "tam-topic-card.json",
        observed: "tam-observed.json",
        dataset: "tam-dataset.json",
        recode: "tam-recode.json",
        measurement: "tam-measurement.json",
      },
      emitters: ["lavaan"],
    })).toThrow(/provenance must be demonstration/);
  });
});
