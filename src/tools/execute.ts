import { parseQuantBundle } from "../bundle.js";
import { ContractValidationError, type Finding } from "../core/errors.js";
import { isRecord } from "../core/parse.js";
import { auditDataset, parseDataset } from "../dataset/index.js";
import {
  emitAmosSpec,
  emitCodebookMarkdown,
  emitDictionaryCsv,
  emitLavaanSyntax,
  emitSmartPlsMap,
  emitSpssSyntax,
} from "../emit/index.js";
import { compileGapMap } from "../gap-map/index.js";
import { compileInstrument, parseInstrument } from "../instrument/index.js";
import { compileRecode, recodePlanFromInstrument } from "../recode/index.js";
import { TOOL_SCHEMAS, type ToolName } from "./index.js";

export type ToolResult =
  | { readonly ok: true; readonly name: string; readonly result: unknown }
  | { readonly ok: false; readonly name: string; readonly error: string; readonly details?: readonly Finding[] };

function asRecord(value: unknown, field: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new ContractValidationError([
      { code: "not_object", severity: "error", path: field, message: `${field} must be an object.` },
    ]);
  }
  return value;
}

export function executeTool(name: string, args: unknown): ToolResult {
  try {
    if (!(name in TOOL_SCHEMAS)) {
      return { ok: false, name, error: `Unknown tool: ${name}` };
    }
    const record = asRecord(args, "arguments");
    if (name === "validate_instrument") {
      return { ok: true, name, result: compileInstrument(record.instrument) };
    }
    if (name === "map_gap") {
      const instrument = parseInstrument(record.instrument);
      return { ok: true, name, result: compileGapMap(record.observed, instrument) };
    }
    if (name === "audit_dataset") {
      const instrument = parseInstrument(record.instrument);
      return { ok: true, name, result: auditDataset(record.dataset, instrument) };
    }
    if (name === "compile_recode") {
      const instrument = parseInstrument(record.instrument);
      const dataset = parseDataset(record.dataset);
      const recode = record.recode === undefined ? recodePlanFromInstrument(instrument) : record.recode;
      return { ok: true, name, result: compileRecode(recode, dataset, instrument) };
    }
    if (name === "plan_recode") {
      const instrument = parseInstrument(record.instrument);
      return { ok: true, name, result: recodePlanFromInstrument(instrument) };
    }
    if (name === "emit_codebook") {
      const instrument = parseInstrument(record.instrument);
      return {
        ok: true,
        name,
        result: { markdown: emitCodebookMarkdown(instrument), csv: emitDictionaryCsv(instrument) },
      };
    }
    if (name === "emit_spss_syntax") {
      return { ok: true, name, result: emitSpssSyntax(parseQuantBundle(record.bundle)) };
    }
    if (name === "emit_measurement_spec") {
      const bundle = parseQuantBundle(record.bundle);
      const format = record.format;
      if (format === "lavaan") {
        return { ok: true, name, result: emitLavaanSyntax(bundle) };
      }
      if (format === "amos") {
        return { ok: true, name, result: emitAmosSpec(bundle) };
      }
      if (format === "smartpls") {
        return { ok: true, name, result: emitSmartPlsMap(bundle) };
      }
      return { ok: false, name, error: "format must be lavaan, amos, or smartpls." };
    }
    return { ok: false, name, error: `Unhandled tool: ${name}` };
  } catch (error) {
    if (error instanceof ContractValidationError) {
      return { ok: false, name, error: error.message, details: error.details };
    }
    return { ok: false, name, error: error instanceof Error ? error.message : String(error) };
  }
}

export const TOOL_NAMES = Object.keys(TOOL_SCHEMAS) as ToolName[];
