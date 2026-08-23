import { estimatorNote } from "../measurement/index.js";
import { SCHEMA, type QuantBundle, type SmartPlsMap } from "../core/types.js";

export function emitSmartPlsMap(bundle: QuantBundle): SmartPlsMap {
  const { measurement } = bundle;
  return {
    schemaVersion: SCHEMA.smartPlsMap,
    indicators: measurement.constructs.flatMap((construct) =>
      construct.itemCodes.map((indicator) => ({
        construct: construct.code,
        indicator,
        mode: construct.kind === "formative" ? ("B" as const) : ("A" as const),
      })),
    ),
    inner: measurement.paths.map((path) => ({ from: path.from, to: path.to })),
    note: `${estimatorNote(measurement.engineOptions?.estimator ?? "PLS", "smartpls")} Binary .splsm files are not emitted.`,
  };
}
