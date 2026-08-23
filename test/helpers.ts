import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { Instrument } from "../src/core/types.js";
import { parseInstrument } from "../src/instrument/index.js";

export function loadExample(name: string): unknown {
  return JSON.parse(readFileSync(fileURLToPath(new URL(`../examples/${name}`, import.meta.url)), "utf8")) as unknown;
}

export function tamInstrument(): Instrument {
  return parseInstrument(loadExample("tam-instrument.json"));
}

export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
