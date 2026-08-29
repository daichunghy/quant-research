import { describe, expect, it } from "vitest";
import { extractSourceLocationPaths, findFindingCodes } from "../scripts/check-errors.mjs";

describe("error reference call-site detection", () => {
  it("only counts the first argument of a semantic finding call", () => {
    const source = `
      const unrelated = ERROR_CODES.invalid_type;
      const documentation = "finding(ERROR_CODES.missing_field, path, message)";
      // finding(ERROR_CODES.unknown_column, path, message)
      /* finding(ERROR_CODES.non_numeric, path, message) */
      const object = { finding: () => undefined };
      object.finding(ERROR_CODES.invalid_enum, path, message);
      finding(
        ERROR_CODES.invalid_receipt,
        path,
        message,
      );
    `;

    expect(findFindingCodes(source)).toEqual(["invalid_receipt"]);
  });

  it("supports documented source paths without accepting arbitrary path text", () => {
    expect(extractSourceLocationPaths("`src/core/errors.ts`, `src/dataset/index.ts`"))
      .toEqual(["src/core/errors.ts", "src/dataset/index.ts"]);
    expect(extractSourceLocationPaths("registry only; no source path"))
      .toEqual([]);
  });
});
