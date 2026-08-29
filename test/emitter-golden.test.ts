import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseQuantBundle } from "../src/bundle.js";
import {
  emitAmosSpec,
  emitLavaanSyntax,
  emitSmartPlsMap,
  emitSpssSyntax,
} from "../src/emit/index.js";
import type { QuantBundle } from "../src/core/types.js";
import { loadExample } from "./helpers.js";

const EXPECTED_DIR = new URL("./fixtures/emitter-golden/expected/", import.meta.url);

function readExpected(name: string): string {
  return readFileSync(fileURLToPath(new URL(name, EXPECTED_DIR)), "utf8");
}

function formatJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function bundle(): QuantBundle {
  return parseQuantBundle(loadExample("tam-bundle.json"));
}

describe("emitter golden fixtures", () => {
  it("matches the exact SPSS output and remains deterministic", () => {
    const actual = emitSpssSyntax(bundle());

    expect(emitSpssSyntax(bundle())).toBe(actual);
    expect(actual).toBe(readExpected("spss.txt"));
  });

  it("matches the exact lavaan output and remains deterministic", () => {
    const actual = emitLavaanSyntax(bundle());

    expect(emitLavaanSyntax(bundle())).toBe(actual);
    expect(actual).toBe(readExpected("lavaan.txt"));
  });

  it("matches the exact AMOS JSON output and remains deterministic", () => {
    const actual = formatJson(emitAmosSpec(bundle()));

    expect(formatJson(emitAmosSpec(bundle()))).toBe(actual);
    expect(actual).toBe(readExpected("amos.json"));
  });

  it("matches the exact SmartPLS JSON output and remains deterministic", () => {
    const actual = formatJson(emitSmartPlsMap(bundle()));

    expect(formatJson(emitSmartPlsMap(bundle()))).toBe(actual);
    expect(actual).toBe(readExpected("smartpls.json"));
  });
});
