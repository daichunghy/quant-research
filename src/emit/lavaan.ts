import { estimatorNote } from "../measurement/index.js";
import type { QuantBundle } from "../core/types.js";

export function emitLavaanSyntax(bundle: QuantBundle): string {
  const { instrument, measurement } = bundle;
  const lines: string[] = [
    "# AgentBiz quant-research lavaan specification.",
    "# Demonstration/specification only. This is not a fitted model.",
    `# ${estimatorNote(measurement.engineOptions?.estimator, measurement.engine)}`,
    "",
    "model <- '",
  ];

  for (const construct of measurement.constructs) {
    const source = instrument.constructs.find((item) => item.code === construct.code);
    if (!source) {
      continue;
    }
    const reversed = source.items.filter((item) => item.reverse).map((item) => item.code);
    if (reversed.length > 0) {
      lines.push(`  # reverse-scored in data, not here: ${reversed.join(", ")}`);
    }
    lines.push(`  ${construct.code} =~ ${construct.itemCodes.join(" + ")}`);
  }

  if (measurement.paths.length > 0) {
    lines.push("");
    for (const path of measurement.paths) {
      const comment = path.sign === "-" ? "  # hypothesized negative path" : "";
      lines.push(`  ${path.to} ~ ${path.from}${comment}`);
    }
  }

  lines.push("'");
  lines.push("");
  lines.push("# fit <- lavaan::sem(model, data = your_data)  # not executed by this library");
  return `${lines.join("\n")}\n`;
}
