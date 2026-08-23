import type { Finding } from "./errors.js";

export const SCHEMA = {
  instrument: "agentbiz.instrument.v1",
  topicCard: "agentbiz.topic-card.v1",
  gapMap: "agentbiz.gap-map.v1",
  dataset: "agentbiz.dataset.v1",
  recode: "agentbiz.recode.v1",
  measurement: "agentbiz.measurement.v1",
  receipt: "agentbiz.receipt.v1",
  amosSpec: "agentbiz.amos-spec.v1",
  smartPlsMap: "agentbiz.smartpls-map.v1",
} as const;

export const COMPILER_VERSION = "1" as const;

export type SchemaVersion = (typeof SCHEMA)[keyof typeof SCHEMA];

export type ConstructKind = "reflective" | "formative";
export type ItemStatus = "demonstration" | "cited";
export type ClaimClass = "description" | "association" | "prediction" | "causal";
export type StudyMode = "confirmatory" | "exploratory";
export type EngineName = "spss" | "amos" | "smartpls" | "lavaan";
export type MeasurementMode = "cb-sem" | "pls-sem" | "reliability-only";
export type EstimatorName = "ML" | "WLSMV" | "PLS";
export type ColumnRole = "id" | "demographic" | "indicator" | "score" | "other";
export type GapStatus = "covered" | "partial" | "missing" | "unexpected" | "mismatch";
export type ReceiptStatus = "compiled" | "blocked" | "audited";
export type HypothesisSign = "+" | "-";

export interface ScaleSpec {
  readonly min: number;
  readonly max: number;
  readonly anchors?: readonly ScaleAnchor[];
}

export interface ScaleAnchor {
  readonly value: number;
  readonly label: string;
}

export interface ItemSource {
  readonly citation?: string;
  readonly note?: string;
}

export interface InstrumentItem {
  readonly code: string;
  readonly text: string;
  readonly reverse: boolean;
  readonly status: ItemStatus;
  readonly source?: ItemSource;
}

export interface InstrumentConstruct {
  readonly code: string;
  readonly name: string;
  readonly kind: ConstructKind;
  readonly scale: ScaleSpec;
  readonly items: readonly InstrumentItem[];
}

export interface Instrument {
  readonly schemaVersion: typeof SCHEMA.instrument;
  readonly language: string;
  readonly constructs: readonly InstrumentConstruct[];
}

export interface DictionaryRow {
  readonly constructCode: string;
  readonly constructName: string;
  readonly itemCode: string;
  readonly text: string;
  readonly min: number;
  readonly max: number;
  readonly reverse: boolean;
  readonly status: ItemStatus;
  readonly citation: string;
}

export interface InstrumentArtifact {
  readonly instrument: Instrument;
  readonly dictionary: readonly DictionaryRow[];
}

export interface Hypothesis {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly sign: HypothesisSign;
}

export interface TopicCard {
  readonly schemaVersion: typeof SCHEMA.topicCard;
  readonly question: string;
  readonly claimClass: ClaimClass;
  readonly population: string;
  readonly unit: string;
  readonly timeframe: string;
  readonly constructCodes: readonly string[];
  readonly hypotheses: readonly Hypothesis[];
  readonly engine: EngineName;
  readonly mode: StudyMode;
}

export interface ObservedColumn {
  readonly column: string;
  readonly itemCode?: string;
  readonly constructCode?: string;
  readonly reverse?: boolean;
  readonly scale?: ScaleSpec;
}

export interface GapMapInput {
  readonly schemaVersion: typeof SCHEMA.gapMap;
  readonly observed: readonly ObservedColumn[];
}

export interface GapMapRow {
  readonly constructCode: string;
  readonly constructName: string;
  readonly status: GapStatus;
  readonly expectedItems: number;
  readonly observedItems: number;
  readonly missingItemCodes: readonly string[];
  readonly observedColumns: readonly string[];
  readonly notes: readonly string[];
}

export interface GapMapArtifact {
  readonly rows: readonly GapMapRow[];
  readonly unexpected: readonly ObservedColumn[];
}

export interface DatasetColumn {
  readonly name: string;
  readonly role: ColumnRole;
  readonly itemCode?: string;
}

export type CellValue = string | number | null;

export interface Dataset {
  readonly schemaVersion: typeof SCHEMA.dataset;
  readonly columns: readonly DatasetColumn[];
  readonly rows: readonly Readonly<Record<string, CellValue>>[];
  readonly rowCount: number;
}

export type RecodeOperation =
  | {
      readonly kind: "reverse-score";
      readonly itemCode: string;
      readonly as: string;
    }
  | {
      readonly kind: "copy-as";
      readonly from: string;
      readonly as: string;
    }
  | {
      readonly kind: "missing-code";
      readonly column: string;
      readonly sentinels: readonly (string | number)[];
      readonly as: string;
    }
  | {
      readonly kind: "flag-straight-line";
      readonly as: string;
    }
  | {
      readonly kind: "construct-score";
      readonly constructCode: string;
      readonly as: string;
    };

export interface RecodePlan {
  readonly schemaVersion: typeof SCHEMA.recode;
  readonly operations: readonly RecodeOperation[];
}

export interface RecodeLogEntry {
  readonly operationIndex: number;
  readonly kind: RecodeOperation["kind"];
  readonly target: string;
  readonly affectedCells: number;
}

export interface RecodeArtifact {
  readonly columns: readonly DatasetColumn[];
  readonly rows: readonly Readonly<Record<string, CellValue>>[];
  readonly log: readonly RecodeLogEntry[];
}

export interface EngineOptions {
  readonly estimator?: EstimatorName;
}

export interface MeasurementInput {
  readonly schemaVersion: typeof SCHEMA.measurement;
  readonly mode: MeasurementMode;
  readonly engineOptions?: EngineOptions;
  readonly strict?: boolean;
}

export interface MeasurementConstruct {
  readonly code: string;
  readonly kind: ConstructKind;
  readonly itemCodes: readonly string[];
  readonly itemCount: number;
}

export interface MeasurementModel {
  readonly schemaVersion: typeof SCHEMA.measurement;
  readonly mode: MeasurementMode;
  readonly engine: EngineName;
  readonly constructs: readonly MeasurementConstruct[];
  readonly paths: readonly Hypothesis[];
  readonly engineOptions?: EngineOptions;
}

export interface AmosPath {
  readonly from: string;
  readonly to: string;
  readonly type: "load" | "regress";
}

export interface AmosSpec {
  readonly schemaVersion: typeof SCHEMA.amosSpec;
  readonly variables: readonly string[];
  readonly paths: readonly AmosPath[];
  readonly note: string;
}

export interface SmartPlsIndicator {
  readonly construct: string;
  readonly indicator: string;
  readonly mode: "A" | "B";
}

export interface SmartPlsEdge {
  readonly from: string;
  readonly to: string;
}

export interface SmartPlsMap {
  readonly schemaVersion: typeof SCHEMA.smartPlsMap;
  readonly indicators: readonly SmartPlsIndicator[];
  readonly inner: readonly SmartPlsEdge[];
  readonly note: string;
}

export interface QuantBundle {
  readonly instrument: Instrument;
  readonly topicCard: TopicCard;
  readonly measurement: MeasurementModel;
}

export interface ReceiptCounts {
  readonly constructs?: number;
  readonly items?: number;
  readonly hypotheses?: number;
  readonly observed?: number;
  readonly rows?: number;
  readonly columns?: number;
  readonly recodedCells?: number;
  readonly straightLineRows?: number;
  readonly outOfBoundCells?: number;
  readonly missingCells?: number;
  readonly duplicateIds?: number;
  readonly warnings?: number;
  readonly errors?: number;
}

export interface Receipt {
  readonly schemaVersion: typeof SCHEMA.receipt;
  readonly status: ReceiptStatus;
  readonly inputDigest: string;
  readonly artifactDigest: string;
  readonly compiler: {
    readonly name: string;
    readonly version: typeof COMPILER_VERSION;
  };
  readonly findings: readonly Finding[];
  readonly counts: ReceiptCounts;
}

export interface Compiled<T> {
  readonly artifact: T;
  readonly receipt: Receipt;
}

export interface ReceiptVerificationInput {
  readonly receipt: unknown;
  readonly input: unknown;
  readonly artifact: unknown;
}

export interface ReceiptVerificationResult {
  readonly status: "pass" | "fail";
  readonly findings: readonly Finding[];
}
