export { canonicalize, digestJson } from "./core/canonical.js";
export {
  ContractValidationError,
  ERROR_CODES,
  finding,
  throwIfErrors,
  type ErrorCode,
  type Finding,
} from "./core/errors.js";
export { verifyReceipt } from "./core/receipt.js";
export { SCHEMA, COMPILER_VERSION } from "./core/types.js";
export type {
  AmosSpec,
  CellValue,
  Compiled,
  Dataset,
  DictionaryRow,
  GapMapArtifact,
  Instrument,
  InstrumentArtifact,
  MeasurementModel,
  QuantBundle,
  Receipt,
  RecodeArtifact,
  SmartPlsMap,
  TopicCard,
} from "./core/types.js";

export { buildDictionary, compileInstrument, indexInstrument, parseInstrument } from "./instrument/index.js";
export { compileTopicCard, parseTopicCard } from "./topic-card/index.js";
export { compileGapMap, observedFromDataset, parseGapMapInput } from "./gap-map/index.js";
export { auditDataset, parseDataset } from "./dataset/index.js";
export type { AuditArtifact, AuditFindingRow } from "./dataset/index.js";
export { compileRecode, parseRecodePlan, recodePlanFromInstrument } from "./recode/index.js";
export { compileMeasurement, parseMeasurementInput } from "./measurement/index.js";
export { parseQuantBundle } from "./bundle.js";
export {
  emitAmosSpec,
  emitCodebookMarkdown,
  emitDatasetCsv,
  emitDictionaryCsv,
  emitLavaanSyntax,
  emitSmartPlsMap,
  emitSpssDataList,
  emitSpssSyntax,
} from "./emit/index.js";
export { TOOL_SCHEMAS } from "./tools/index.js";
export { executeTool } from "./tools/execute.js";
export { handleMcpMessage } from "./mcp.js";
