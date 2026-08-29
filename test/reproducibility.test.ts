import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { runCli, type CliIO } from "../src/cli.js";

interface ReproducibilityManifest {
  readonly manifestVersion: string;
  readonly package: { readonly name: string; readonly version: string };
  readonly fixtures: readonly { readonly path: string; readonly sha256: string }[];
  readonly replays: readonly {
    readonly name: string;
    readonly argv: readonly string[];
    readonly artifactDigest: string;
  }[];
}

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

const examplesRoot = fileURLToPath(new URL("../examples/", import.meta.url));
const manifestPath = join(examplesRoot, "reproducibility-manifest.json");
const packagePath = fileURLToPath(new URL("../package.json", import.meta.url));

async function loadJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8")) as unknown;
}

async function sha256(path: string): Promise<string> {
  return `sha256:${createHash("sha256").update(await readFile(path)).digest("hex")}`;
}

describe("reproducibility manifest", () => {
  it("pins every distributed example fixture", async () => {
    const manifest = (await loadJson(manifestPath)) as ReproducibilityManifest;
    const packageJson = (await loadJson(packagePath)) as { name: string; version: string };
    const fixturePaths = manifest.fixtures.map((fixture) => fixture.path).sort();
    const exampleFiles = (await readdir(examplesRoot))
      .filter((file) => file.endsWith(".json") && file !== "reproducibility-manifest.json")
      .map((file) => `examples/${file}`)
      .sort();

    expect(manifest.manifestVersion).toBe("agentbiz.reproducibility.v1");
    expect(manifest.package).toEqual({ name: packageJson.name, version: packageJson.version });
    expect(fixturePaths).toEqual(exampleFiles);

    for (const fixture of manifest.fixtures) {
      expect(fixture.path.startsWith("examples/")).toBe(true);
      expect(fixture.path.includes("..")).toBe(false);
      expect(await sha256(join(examplesRoot, fixture.path.slice("examples/".length)))).toBe(fixture.sha256);
    }
  });

  it("pins deterministic receipt artifact digests for replay commands", async () => {
    for (const replay of (await loadJson(manifestPath) as ReproducibilityManifest).replays) {
      const stdout = new MemoryStream();
      const stderr = new MemoryStream();
      const io: CliIO = { stdout, stderr };
      const code = await runCli(replay.argv, io);
      expect(code, `${replay.name}: ${stderr.text()}`).toBe(0);
      const payload = JSON.parse(stdout.text()) as { receipt?: { artifactDigest?: string } };
      expect(payload.receipt?.artifactDigest, replay.name).toBe(replay.artifactDigest);
    }
  });
});
