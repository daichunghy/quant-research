import { ERROR_CODES, finding, type Finding } from "./errors.js";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function rejectUnknownKeys(
  record: Record<string, unknown>,
  allowed: readonly string[],
  path: string,
  issues: Finding[],
): void {
  const allowedKeys = new Set(allowed);
  for (const key of Object.keys(record)) {
    if (!allowedKeys.has(key)) {
      issues.push(finding(ERROR_CODES.invalid_type, `${path}.${key}`, `Unknown field '${key}'.`));
    }
  }
}

export function requireRecord(value: unknown, path: string, issues: Finding[]): Record<string, unknown> | undefined {
  if (!isRecord(value)) {
    issues.push(finding(ERROR_CODES.not_object, path, "Value must be a JSON object."));
    return undefined;
  }
  return value;
}

export function requireSchema(
  record: Record<string, unknown>,
  expected: string,
  issues: Finding[],
  path = "schemaVersion",
): void {
  if (record.schemaVersion !== expected) {
    issues.push(
      finding(
        ERROR_CODES.invalid_schema_version,
        path,
        `schemaVersion must equal ${expected}.`,
      ),
    );
  }
}

export function requireString(record: Record<string, unknown>, key: string, path: string, issues: Finding[]): string {
  const value = record[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    issues.push(finding(ERROR_CODES.missing_field, path, `${key} must be a non-empty string.`));
    return "";
  }
  return value.trim();
}

export function optionalBoolean(
  record: Record<string, unknown>,
  key: string,
  path: string,
  issues: Finding[],
): boolean | undefined {
  if (!(key in record)) {
    return undefined;
  }
  const value = record[key];
  if (typeof value !== "boolean") {
    issues.push(finding(ERROR_CODES.invalid_type, path, `${key} must be a boolean.`));
    return undefined;
  }
  return value;
}

export function requireEnum<T extends string>(
  record: Record<string, unknown>,
  key: string,
  path: string,
  allowed: readonly T[],
  issues: Finding[],
): T | undefined {
  const value = record[key];
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    issues.push(
      finding(ERROR_CODES.invalid_enum, path, `${key} must be one of: ${allowed.join(", ")}.`),
    );
    return undefined;
  }
  return value as T;
}

export function requireArray(
  record: Record<string, unknown>,
  key: string,
  path: string,
  issues: Finding[],
): unknown[] {
  const value = record[key];
  if (!Array.isArray(value)) {
    issues.push(finding(ERROR_CODES.invalid_type, path, `${key} must be an array.`));
    return [];
  }
  return value;
}

export function requireNonEmptyArray(
  record: Record<string, unknown>,
  key: string,
  path: string,
  issues: Finding[],
): unknown[] {
  const value = requireArray(record, key, path, issues);
  if (value.length === 0) {
    issues.push(finding(ERROR_CODES.empty_collection, path, `${key} must not be empty.`));
  }
  return value;
}

export function requireFiniteNumber(
  record: Record<string, unknown>,
  key: string,
  path: string,
  issues: Finding[],
): number | undefined {
  const value = record[key];
  if (typeof value !== "number" || !Number.isFinite(value) || !Number.isInteger(value)) {
    issues.push(finding(ERROR_CODES.invalid_type, path, `${key} must be a finite integer.`));
    return undefined;
  }
  return value;
}

export const CODE_PATTERN = /^[A-Z][A-Z0-9_]{1,31}$/;
export const COLUMN_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;

export function requireCode(value: string, path: string, issues: Finding[]): string {
  if (!CODE_PATTERN.test(value)) {
    issues.push(
      finding(
        ERROR_CODES.invalid_identifier,
        path,
        "Code must match /^[A-Z][A-Z0-9_]{1,31}$/.",
      ),
    );
  }
  return value;
}

export function requireColumnName(value: string, path: string, issues: Finding[]): string {
  if (!COLUMN_NAME_PATTERN.test(value)) {
    issues.push(
      finding(
        ERROR_CODES.invalid_identifier,
        path,
        "Column name must match /^[A-Za-z][A-Za-z0-9_]{0,63}$/.",
      ),
    );
  }
  return value;
}
