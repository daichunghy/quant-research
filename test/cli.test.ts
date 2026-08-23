import { describe, expect, it } from "vitest";
import { runCli } from "../src/cli.js";
import { TOOL_SCHEMAS } from "../src/tools/index.js";

class MemoryStream {
  public chunks: string[] = [];

  public write(chunk: string): boolean {
    this.chunks.push(chunk);
    return true;
  }

  public text(): string {
    return this.chunks.join("");
  }
}

describe("CLI", () => {
  it("compiles the TAM instrument example", async () => {
    const stdout = new MemoryStream();
    const stderr = new MemoryStream();
    const code = await runCli(["compile", "examples/tam-instrument.json"], { stdout, stderr });
    expect(code).toBe(0);
    const payload = JSON.parse(stdout.text()) as { receipt: { status: string }; artifact: { dictionary: unknown[] } };
    expect(payload.receipt.status).toBe("compiled");
    expect(payload.artifact.dictionary).toHaveLength(9);
  });

  it("emits lavaan text", async () => {
    const stdout = new MemoryStream();
    const stderr = new MemoryStream();
    const code = await runCli(["emit-lavaan", "examples/tam-bundle.json"], { stdout, stderr });
    expect(code).toBe(0);
    expect(stdout.text()).toContain("model <- '");
    expect(stdout.text()).toContain("PU =~ PU1 + PU2 + PU3");
  });

  it("prints help", async () => {
    const stdout = new MemoryStream();
    const stderr = new MemoryStream();
    const code = await runCli(["help"], { stdout, stderr });
    expect(code).toBe(0);
    expect(stdout.text()).toContain("does not run SPSS");
  });
});

describe("tool schemas", () => {
  it("exports the five agent tool contracts", () => {
    expect(Object.keys(TOOL_SCHEMAS)).toEqual([
      "validate_instrument",
      "map_gap",
      "compile_recode",
      "plan_recode",
      "audit_dataset",
      "emit_codebook",
      "emit_spss_syntax",
      "emit_measurement_spec",
    ]);
  });
});
