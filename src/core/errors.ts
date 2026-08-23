export const ERROR_CODES = {
  not_object: "not_object",
  invalid_schema_version: "invalid_schema_version",
  missing_field: "missing_field",
  invalid_type: "invalid_type",
  invalid_identifier: "invalid_identifier",
  invalid_enum: "invalid_enum",
  empty_collection: "empty_collection",
  duplicate_code: "duplicate_code",
  duplicate_column: "duplicate_column",
  invalid_scale: "invalid_scale",
  invalid_anchor: "invalid_anchor",
  cited_without_source: "cited_without_source",
  reverse_scale_unsupported: "reverse_scale_unsupported",
  unknown_construct: "unknown_construct",
  unknown_item: "unknown_item",
  orphan_hypothesis: "orphan_hypothesis",
  row_count_mismatch: "row_count_mismatch",
  unknown_column: "unknown_column",
  column_exists: "column_exists",
  non_numeric: "non_numeric",
  empty_operations: "empty_operations",
  under_identified: "under_identified",
  invalid_receipt: "invalid_receipt",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export interface Finding {
  readonly code: string;
  readonly severity: "error" | "warning";
  readonly path: string;
  readonly message: string;
}

export function finding(
  code: string,
  path: string,
  message: string,
  severity: "error" | "warning" = "error",
): Finding {
  return { code, severity, path, message };
}

export class ContractValidationError extends Error {
  public readonly details: readonly Finding[];

  public constructor(details: readonly Finding[]) {
    const issues = details.map((detail) => `${detail.path}: ${detail.message}`);
    super(`Invalid @agentbiz/quant-research contract:\n- ${issues.join("\n- ")}`);
    this.name = "ContractValidationError";
    this.details = details;
  }
}

export function throwIfErrors(findings: readonly Finding[]): void {
  const errors = findings.filter((item) => item.severity === "error");
  if (errors.length > 0) {
    throw new ContractValidationError(errors);
  }
}
