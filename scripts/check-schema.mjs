#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);

const files = [
  "instrument.v1.schema.json",
  "topic-card.v1.schema.json",
  "gap-map.v1.schema.json",
  "dataset.v1.schema.json",
  "recode.v1.schema.json",
  "measurement.v1.schema.json",
  "receipt.v1.schema.json",
];

for (const file of files) {
  const schema = JSON.parse(await readFile(join(root, "schemas", file), "utf8"));
  ajv.compile(schema);
  process.stdout.write(`ok ${file}\n`);
}
