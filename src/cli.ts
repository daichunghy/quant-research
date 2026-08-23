#!/usr/bin/env node

import { realpathSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseQuantBundle } from "./bundle.js";
import { ContractValidationError } from "./core/errors.js";
import { isRecord } from "./core/parse.js";
import { verifyReceipt } from "./core/receipt.js";
import { SCHEMA, type Receipt } from "./core/types.js";
import { auditDataset, parseDataset } from "./dataset/index.js";
import {
  emitAmosSpec,
  emitCodebookMarkdown,
  emitDatasetCsv,
  emitDictionaryCsv,
  emitLavaanSyntax,
  emitSmartPlsMap,
  emitSpssDataList,
  emitSpssSyntax,
} from "./emit/index.js";
import { compileGapMap, observedFromDataset } from "./gap-map/index.js";
import { compileInstrument, parseInstrument } from "./instrument/index.js";
import { compileMeasurement } from "./measurement/index.js";
import { compileRecode, recodePlanFromInstrument } from "./recode/index.js";
import { compileTopicCard } from "./topic-card/index.js";

const MAX_JSON_BYTES = 2 * 1024 * 1024;

export async function readJson(path: string): Promise<unknown> {
  const resolved = resolve(path);
  const info = await stat(resolved);
  if (info.size > MAX_JSON_BYTES) {
    throw new Error(`JSON file exceeds the ${MAX_JSON_BYTES} byte limit: ${path}`);
  }
  return JSON.parse(await readFile(resolved, "utf8")) as unknown;
}

function print(value: unknown, stdout: CliIO["stdout"]): void {
  stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function flagValue(argv: readonly string[], name: string): string | undefined {
  const index = argv.indexOf(name);
  if (index === -1) {
    return undefined;
  }
  return argv[index + 1];
}

function help(stdout: CliIO["stdout"]): void {
  stdout.write(`@agentbiz/quant-research foundation CLI

Usage:
  agentbiz-quant compile <instrument.json>
  agentbiz-quant compile <topic-card.json> --instrument <instrument.json>
  agentbiz-quant compile <measurement.json> --instrument <instrument.json> --topic-card <topic-card.json>
  agentbiz-quant gap <instrument.json> <observed.json>
  agentbiz-quant audit <instrument.json> <dataset.json>
  agentbiz-quant recode <instrument.json> <dataset.json> [recode.json]
  agentbiz-quant plan-recode <instrument.json>
  agentbiz-quant codebook <instrument.json>
  agentbiz-quant dictionary-csv <instrument.json>
  agentbiz-quant csv <dataset.json>
  agentbiz-quant gap-from-dataset <instrument.json> <dataset.json>
  agentbiz-quant emit-spss <bundle.json>
  agentbiz-quant emit-spss-data <dataset.json>
  agentbiz-quant emit-lavaan <bundle.json>
  agentbiz-quant emit-amos <bundle.json>
  agentbiz-quant emit-smartpls <bundle.json>
  agentbiz-quant verify-receipt <receipt.json> <artifact.json> --input <input.json>

This CLI compiles contracts. It does not run SPSS, AMOS, SmartPLS, or lavaan,
and it does not write Excel or Google Sheets files.
MCP stdio server: agentbiz-quant-mcp
`);
}

export interface CliIO {
  readonly stdout: { write(chunk: string): unknown };
  readonly stderr: { write(chunk: string): unknown };
}

export async function runCli(argv: readonly string[], io: CliIO = process): Promise<number> {
  const [command, inputPath, secondPath, thirdPath, ...rest] = argv;
  if (!command || command === "help" || command === "--help" || command === "-h") {
    help(io.stdout);
    return 0;
  }

  const flags = [secondPath, thirdPath, ...rest].filter((value): value is string => Boolean(value));

  if (command === "compile") {
    if (!inputPath) {
      throw new Error("compile requires an input path.");
    }
    const document = await readJson(inputPath);
    if (!isRecord(document) || typeof document.schemaVersion !== "string") {
      throw new Error("Input must be an object with schemaVersion.");
    }
    if (document.schemaVersion === SCHEMA.instrument) {
      print(compileInstrument(document), io.stdout);
      return 0;
    }
    if (document.schemaVersion === SCHEMA.topicCard) {
      const instrumentPath = flagValue(flags, "--instrument");
      if (!instrumentPath) {
        throw new Error("topic-card compile requires --instrument <path>.");
      }
      const instrument = parseInstrument(await readJson(instrumentPath));
      print(compileTopicCard(document, instrument), io.stdout);
      return 0;
    }
    if (document.schemaVersion === SCHEMA.measurement) {
      const instrumentPath = flagValue(flags, "--instrument");
      const topicPath = flagValue(flags, "--topic-card");
      if (!instrumentPath || !topicPath) {
        throw new Error("measurement compile requires --instrument and --topic-card.");
      }
      const instrument = parseInstrument(await readJson(instrumentPath));
      const topicCard = compileTopicCard(await readJson(topicPath), instrument).artifact;
      print(compileMeasurement(document, instrument, topicCard), io.stdout);
      return 0;
    }
    throw new Error(`Unsupported schemaVersion for compile: ${document.schemaVersion}`);
  }

  if (command === "gap") {
    if (!inputPath || !secondPath) {
      throw new Error("gap requires <instrument.json> <observed.json>.");
    }
    const instrument = parseInstrument(await readJson(inputPath));
    print(compileGapMap(await readJson(secondPath), instrument), io.stdout);
    return 0;
  }

  if (command === "audit") {
    if (!inputPath || !secondPath) {
      throw new Error("audit requires <instrument.json> <dataset.json>.");
    }
    const instrument = parseInstrument(await readJson(inputPath));
    print(auditDataset(await readJson(secondPath), instrument), io.stdout);
    return 0;
  }

  if (command === "recode") {
    if (!inputPath || !secondPath) {
      throw new Error("recode requires <instrument.json> <dataset.json> [recode.json].");
    }
    const instrument = parseInstrument(await readJson(inputPath));
    const dataset = parseDataset(await readJson(secondPath));
    const plan = thirdPath ? await readJson(thirdPath) : recodePlanFromInstrument(instrument);
    print(compileRecode(plan, dataset, instrument), io.stdout);
    return 0;
  }

  if (command === "plan-recode") {
    if (!inputPath) {
      throw new Error("plan-recode requires <instrument.json>.");
    }
    print(recodePlanFromInstrument(parseInstrument(await readJson(inputPath))), io.stdout);
    return 0;
  }

  if (command === "codebook") {
    if (!inputPath) {
      throw new Error("codebook requires <instrument.json>.");
    }
    io.stdout.write(emitCodebookMarkdown(parseInstrument(await readJson(inputPath))));
    return 0;
  }

  if (command === "dictionary-csv") {
    if (!inputPath) {
      throw new Error("dictionary-csv requires <instrument.json>.");
    }
    io.stdout.write(emitDictionaryCsv(parseInstrument(await readJson(inputPath))));
    return 0;
  }

  if (command === "csv") {
    if (!inputPath) {
      throw new Error("csv requires <dataset.json>.");
    }
    io.stdout.write(emitDatasetCsv(parseDataset(await readJson(inputPath))));
    return 0;
  }

  if (command === "gap-from-dataset") {
    if (!inputPath || !secondPath) {
      throw new Error("gap-from-dataset requires <instrument.json> <dataset.json>.");
    }
    const instrument = parseInstrument(await readJson(inputPath));
    const dataset = parseDataset(await readJson(secondPath));
    print(compileGapMap(observedFromDataset(dataset), instrument), io.stdout);
    return 0;
  }

  if (command === "emit-spss-data") {
    if (!inputPath) {
      throw new Error("emit-spss-data requires <dataset.json>.");
    }
    io.stdout.write(emitSpssDataList(parseDataset(await readJson(inputPath))));
    return 0;
  }

  if (command === "emit-spss" || command === "emit-lavaan" || command === "emit-amos" || command === "emit-smartpls") {
    if (!inputPath) {
      throw new Error(`${command} requires a bundle JSON path.`);
    }
    const bundle = parseQuantBundle(await readJson(inputPath));
    if (command === "emit-spss") {
      io.stdout.write(emitSpssSyntax(bundle));
      return 0;
    }
    if (command === "emit-lavaan") {
      io.stdout.write(emitLavaanSyntax(bundle));
      return 0;
    }
    if (command === "emit-amos") {
      print(emitAmosSpec(bundle), io.stdout);
      return 0;
    }
    print(emitSmartPlsMap(bundle), io.stdout);
    return 0;
  }

  if (command === "verify-receipt") {
    if (!inputPath || !secondPath) {
      throw new Error("verify-receipt requires <receipt.json> <artifact.json> --input <input.json>.");
    }
    const inputFlag = flagValue(flags, "--input");
    if (!inputFlag) {
      throw new Error("verify-receipt requires --input <input.json>.");
    }
    const receipt = (await readJson(inputPath)) as Receipt;
    const result = verifyReceipt({
      receipt,
      artifact: await readJson(secondPath),
      input: await readJson(inputFlag),
    });
    print(result, io.stdout);
    return result.status === "pass" ? 0 : 1;
  }

  throw new Error(`Unknown command: ${command}`);
}

async function main(): Promise<void> {
  try {
    const code = await runCli(process.argv.slice(2));
    process.exitCode = code;
  } catch (error) {
    if (error instanceof ContractValidationError) {
      process.stderr.write(`${JSON.stringify({ error: error.name, details: error.details }, null, 2)}\n`);
      process.exitCode = 1;
      return;
    }
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  }
}

function isMain(): boolean {
  const argvPath = process.argv[1];
  if (!argvPath) {
    return false;
  }
  try {
    return realpathSync(argvPath) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
}

if (isMain()) {
  void main();
}
