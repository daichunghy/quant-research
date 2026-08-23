import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const srcRoot = fileURLToPath(new URL("../src", import.meta.url));

async function walk(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(path)));
    } else if (entry.name.endsWith(".ts")) {
      files.push(path);
    }
  }
  return files;
}

describe("product boundary", () => {
  it("does not implement statistical estimators or spreadsheet writers", async () => {
    const files = await walk(srcRoot);
    const joined = (await Promise.all(files.map((file) => readFile(file, "utf8")))).join("\n");
    expect(joined).not.toMatch(/function\s+(cronbach|ave|htmt|bootstrap|fitSem|calpha)/i);
    expect(joined).not.toMatch(/from ["']exceljs["']|from ["']googleapis["']|googleapis\/sheets/i);
    expect(joined).not.toMatch(/opensheet\.plan\.v1/);
    expect(joined).not.toMatch(/from ["']ai["']/);
  });
});
