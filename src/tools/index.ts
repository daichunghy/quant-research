const demonstrationNote =
  "Demonstration items must use status=demonstration. Do not claim a scale is validated. This tool does not run SEM or write spreadsheets.";

export const TOOL_SCHEMAS = {
  validate_instrument: {
    name: "validate_instrument",
    description: `Validate a quantitative research instrument (scale bank) and return a data dictionary. ${demonstrationNote}`,
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["instrument"],
      properties: {
        instrument: { type: "object", description: "agentbiz.instrument.v1 document." },
      },
    },
  },
  map_gap: {
    name: "map_gap",
    description: `Compare an instrument against observed dataset columns and classify coverage. ${demonstrationNote}`,
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["instrument", "observed"],
      properties: {
        instrument: { type: "object", description: "agentbiz.instrument.v1 document." },
        observed: { type: "object", description: "agentbiz.gap-map.v1 document." },
      },
    },
  },
  compile_recode: {
    name: "compile_recode",
    description: `Compile a recode plan into new columns. Raw rows stay immutable. Does not drop cases. Omit recode to use recodePlanFromInstrument. ${demonstrationNote}`,
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["instrument", "dataset"],
      properties: {
        instrument: { type: "object" },
        dataset: { type: "object", description: "agentbiz.dataset.v1 document." },
        recode: { type: "object", description: "Optional agentbiz.recode.v1 document." },
      },
    },
  },
  plan_recode: {
    name: "plan_recode",
    description: `Build a recode plan from reverse-keyed items, construct means, and a straight-line flag. ${demonstrationNote}`,
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["instrument"],
      properties: {
        instrument: { type: "object" },
      },
    },
  },
  audit_dataset: {
    name: "audit_dataset",
    description: `Audit a dataset snapshot against an instrument. Reports bounds, missing cells, duplicates, and straight-lining. Does not drop rows. ${demonstrationNote}`,
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["instrument", "dataset"],
      properties: {
        instrument: { type: "object" },
        dataset: { type: "object" },
      },
    },
  },
  emit_codebook: {
    name: "emit_codebook",
    description: `Emit a markdown codebook and CSV data dictionary from an instrument. ${demonstrationNote}`,
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["instrument"],
      properties: {
        instrument: { type: "object" },
      },
    },
  },
  emit_spss_syntax: {
    name: "emit_spss_syntax",
    description: `Emit SPSS syntax for labels, reverse recodes, and RELIABILITY. Does not execute SPSS. ${demonstrationNote}`,
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["bundle"],
      properties: {
        bundle: {
          type: "object",
          description: "Object with instrument, topicCard, and measurement documents.",
        },
      },
    },
  },
  emit_measurement_spec: {
    name: "emit_measurement_spec",
    description: `Emit lavaan syntax, AMOS path JSON, or a SmartPLS indicator map. Does not fit a model. ${demonstrationNote}`,
    parameters: {
      type: "object",
      additionalProperties: false,
      required: ["bundle", "format"],
      properties: {
        bundle: { type: "object" },
        format: { type: "string", enum: ["lavaan", "amos", "smartpls"] },
      },
    },
  },
} as const;

export type ToolName = keyof typeof TOOL_SCHEMAS;
