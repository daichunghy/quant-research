import { spawnSync } from "node:child_process";

const commands = [
  ["compile instrument", ["dist/cli.js", "compile", "examples/tam-instrument.json"]],
  ["emit codebook", ["dist/cli.js", "codebook", "examples/tam-instrument.json"]],
  ["recode dataset", ["dist/cli.js", "recode", "examples/tam-instrument.json", "examples/tam-dataset.json"]],
  ["check coverage", ["dist/cli.js", "gap", "examples/tam-instrument.json", "examples/tam-observed.json"]],
  ["emit lavaan", ["dist/cli.js", "emit-lavaan", "examples/tam-bundle.json"]],
  ["emit SPSS", ["dist/cli.js", "emit-spss", "examples/tam-bundle.json"]],
];

for (const [label, args] of commands) {
  console.log(`\n== ${label} ==`);
  const result = spawnSync(process.execPath, args, { stdio: "inherit" });
  if (result.error) {
    console.error(`${label} failed to start: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`${label} exited with status ${result.status ?? 1}`);
    process.exit(result.status ?? 1);
  }
}

console.log("\nfirst-use path passed: deterministic research artifacts were emitted from the demonstration fixtures");
