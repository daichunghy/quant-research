import { estimatorNote } from "../measurement/index.js";
import { SCHEMA, type AmosPath, type AmosSpec, type QuantBundle } from "../core/types.js";

export function emitAmosSpec(bundle: QuantBundle): AmosSpec {
  const { measurement } = bundle;
  const variables = [
    ...measurement.constructs.map((construct) => construct.code),
    ...measurement.constructs.flatMap((construct) => construct.itemCodes),
  ];
  const paths: AmosPath[] = [];
  for (const construct of measurement.constructs) {
    for (const itemCode of construct.itemCodes) {
      paths.push({ from: itemCode, to: construct.code, type: "load" });
    }
  }
  for (const path of measurement.paths) {
    paths.push({ from: path.from, to: path.to, type: "regress" });
  }
  return {
    schemaVersion: SCHEMA.amosSpec,
    variables: [...new Set(variables)],
    paths,
    note: `${estimatorNote(measurement.engineOptions?.estimator, "amos")} Binary .amw files are not emitted.`,
  };
}
