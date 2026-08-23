import { digestJson } from "./canonical.js";
import { ERROR_CODES, finding, type Finding } from "./errors.js";
import { isRecord } from "./parse.js";
import {
  COMPILER_VERSION,
  SCHEMA,
  type Compiled,
  type Receipt,
  type ReceiptCounts,
  type ReceiptStatus,
  type ReceiptVerificationInput,
  type ReceiptVerificationResult,
} from "./types.js";

const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/;
const RECEIPT_STATUSES = new Set(["compiled", "blocked", "audited"]);
const COUNT_KEYS = new Set([
  "constructs",
  "items",
  "hypotheses",
  "observed",
  "rows",
  "columns",
  "recodedCells",
  "straightLineRows",
  "outOfBoundCells",
  "missingCells",
  "duplicateIds",
  "warnings",
  "errors",
]);

function validateReceiptShape(value: unknown, findings: Finding[]): value is Receipt {
  if (!isRecord(value)) {
    findings.push(finding(ERROR_CODES.invalid_receipt, "$", "Receipt must be a JSON object."));
    return false;
  }
  if (!RECEIPT_STATUSES.has(String(value.status))) {
    findings.push(finding(ERROR_CODES.invalid_receipt, "status", "Receipt status is invalid."));
  }
  for (const key of ["inputDigest", "artifactDigest"] as const) {
    if (typeof value[key] !== "string" || !DIGEST_PATTERN.test(value[key])) {
      findings.push(finding(ERROR_CODES.invalid_receipt, key, `${key} must be a sha256 digest.`));
    }
  }
  if (!isRecord(value.compiler)) {
    findings.push(finding(ERROR_CODES.invalid_receipt, "compiler", "Receipt compiler is missing."));
  } else {
    if (typeof value.compiler.name !== "string" || value.compiler.name.length === 0) {
      findings.push(finding(ERROR_CODES.invalid_receipt, "compiler.name", "Receipt compiler.name is required."));
    }
    if (value.compiler.version !== COMPILER_VERSION) {
      findings.push(finding(ERROR_CODES.invalid_receipt, "compiler.version", "Receipt compiler.version is invalid."));
    }
  }
  if (!Array.isArray(value.findings)) {
    findings.push(finding(ERROR_CODES.invalid_receipt, "findings", "Receipt findings must be an array."));
  } else {
    value.findings.forEach((item, index) => {
      if (!isRecord(item)) {
        findings.push(finding(ERROR_CODES.invalid_receipt, `findings[${index}]`, "Finding must be an object."));
        return;
      }
      if (typeof item.code !== "string" || item.code.length === 0) {
        findings.push(finding(ERROR_CODES.invalid_receipt, `findings[${index}].code`, "Finding code is required."));
      }
      if (item.severity !== "error" && item.severity !== "warning") {
        findings.push(finding(ERROR_CODES.invalid_receipt, `findings[${index}].severity`, "Finding severity is invalid."));
      }
      for (const key of ["path", "message"] as const) {
        if (typeof item[key] !== "string" || item[key].length === 0) {
          findings.push(finding(ERROR_CODES.invalid_receipt, `findings[${index}].${key}`, `Finding ${key} is required.`));
        }
      }
    });
  }
  if (!isRecord(value.counts)) {
    findings.push(finding(ERROR_CODES.invalid_receipt, "counts", "Receipt counts must be an object."));
  } else {
    for (const [key, count] of Object.entries(value.counts)) {
      if (!COUNT_KEYS.has(key) || typeof count !== "number" || !Number.isInteger(count) || count < 0) {
        findings.push(finding(ERROR_CODES.invalid_receipt, `counts.${key}`, "Receipt counts must be non-negative integers."));
      }
    }
  }
  return findings.length === 0;
}

export function compileOk<T>(
  compilerName: string,
  input: unknown,
  artifact: T,
  findings: readonly Finding[],
  counts: ReceiptCounts,
  status: ReceiptStatus = "compiled",
): Compiled<T> {
  const warnings = findings.filter((item) => item.severity === "warning").length;
  const errors = findings.filter((item) => item.severity === "error").length;
  const receipt: Receipt = {
    schemaVersion: SCHEMA.receipt,
    status,
    inputDigest: digestJson(input),
    artifactDigest: digestJson(artifact),
    compiler: { name: compilerName, version: COMPILER_VERSION },
    findings,
    counts: {
      ...counts,
      ...(warnings > 0 ? { warnings } : {}),
      ...(errors > 0 ? { errors } : {}),
    },
  };
  return { artifact, receipt };
}

export function verifyReceipt(input: ReceiptVerificationInput): ReceiptVerificationResult {
  const findings: Finding[] = [];
  const { artifact } = input;

  if (!isRecord(input.receipt) || input.receipt.schemaVersion !== SCHEMA.receipt) {
    findings.push(
      finding(ERROR_CODES.invalid_receipt, "schemaVersion", "Receipt schemaVersion must equal agentbiz.receipt.v1."),
    );
    return { status: "fail", findings };
  }
  const receipt = input.receipt as unknown as Receipt;
  validateReceiptShape(receipt, findings);
  if (findings.length > 0) {
    return { status: "fail", findings };
  }

  const expectedInput = digestJson(input.input);
  if (receipt.inputDigest !== expectedInput) {
    findings.push(
      finding(ERROR_CODES.invalid_receipt, "inputDigest", "Receipt inputDigest does not match digestJson(input)."),
    );
  }

  const expectedArtifact = digestJson(artifact);
  if (receipt.artifactDigest !== expectedArtifact) {
    findings.push(
      finding(
        ERROR_CODES.invalid_receipt,
        "artifactDigest",
        "Receipt artifactDigest does not match digestJson(artifact).",
      ),
    );
  }

  return { status: findings.length === 0 ? "pass" : "fail", findings };
}
