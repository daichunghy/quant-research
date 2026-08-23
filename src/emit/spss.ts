import type { Instrument, QuantBundle } from "../core/types.js";

function quote(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function reverseMapping(min: number, max: number): string {
  const pairs: string[] = [];
  for (let value = min; value <= max; value += 1) {
    pairs.push(`(${value}=${min + max - value})`);
  }
  return pairs.join(" ");
}

function reliabilityName(code: string, reverse: boolean): string {
  return reverse ? `${code}_R` : code;
}

export function emitSpssSyntax(bundle: QuantBundle): string {
  const { instrument, measurement } = bundle;
  const lines: string[] = [
    "* AgentBiz quant-research SPSS syntax.",
    "* Demonstration/specification only. This file does not contain estimated results.",
    "* Do not treat this as executed output from SPSS.",
    "",
    "VARIABLE LABELS",
  ];

  const labels: string[] = [];
  for (const construct of instrument.constructs) {
    for (const item of construct.items) {
      labels.push(`  ${item.code} ${quote(item.text)}`);
    }
  }
  lines.push(`${labels.join("\n")}\n  .`);
  lines.push("");

  const grouped = new Map<string, { min: number; max: number; codes: string[]; anchors?: string }>();
  for (const construct of instrument.constructs) {
    const key = `${construct.scale.min}:${construct.scale.max}`;
    const current = grouped.get(key) ?? { min: construct.scale.min, max: construct.scale.max, codes: [] };
    current.codes.push(...construct.items.map((item) => item.code));
    if (construct.scale.anchors && !current.anchors) {
      current.anchors = construct.scale.anchors.map((anchor) => `  ${anchor.value} ${quote(anchor.label)}`).join("\n");
    }
    grouped.set(key, current);
  }

  for (const group of grouped.values()) {
    lines.push(`VALUE LABELS ${group.codes.join(" ")}`);
    if (group.anchors) {
      lines.push(group.anchors);
    } else {
      lines.push(`  ${group.min} 'Low'`);
      lines.push(`  ${group.max} 'High'`);
    }
    lines.push("  .");
    lines.push("");
  }

  for (const construct of instrument.constructs) {
    for (const item of construct.items) {
      if (!item.reverse) {
        continue;
      }
      lines.push(
        `RECODE ${item.code} ${reverseMapping(construct.scale.min, construct.scale.max)} INTO ${item.code}_R.`,
      );
      lines.push(`VARIABLE LABELS ${item.code}_R ${quote(`${item.text} (reversed)`)}.`);
    }
  }
  lines.push("");

  for (const construct of measurement.constructs) {
    const source = instrument.constructs.find((item) => item.code === construct.code);
    if (!source) {
      continue;
    }
    const variables = source.items.map((item) => reliabilityName(item.code, item.reverse)).join(" ");
    lines.push(`RELIABILITY`);
    lines.push(`  /VARIABLES=${variables}`);
    lines.push(`  /MODEL=ALPHA`);
    lines.push(`  /SUMMARY=TOTAL.`);
    lines.push("");
  }

  lines.push("* Structural / SEM estimation is out of scope for this compiler.");
  lines.push("* Use AMOS, lavaan, or SmartPLS emitters for path specifications.");
  return `${lines.join("\n")}\n`;
}

export function instrumentHasReverse(instrument: Instrument): boolean {
  return instrument.constructs.some((construct) => construct.items.some((item) => item.reverse));
}
