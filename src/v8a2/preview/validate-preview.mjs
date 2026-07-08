// FounderGate V8-A2 — preview.json validator (reuses the V8-A1 dependency-free
// subset validator, feeding it the local preview schema object).

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { validate as v8a1Validate } from "../../v8a1/validate.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
export const PREVIEW_SCHEMA = JSON.parse(readFileSync(join(HERE, "preview.schema.json"), "utf8"));

export function validate(cfg) {
  return v8a1Validate(cfg, PREVIEW_SCHEMA);
}
