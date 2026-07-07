// FounderGate V8-A1 — Schema-First Machine Gate (Law 53).
//
// "Before any dashboard UI work begins, all .foundergate/ schemas must exist and
//  pass validation, including data-classification, release-label, and cost-budget
//  fields. A fixture project must pass validation. No schema, no UI."
//
// This gate is the mechanical check the CI runs (via its selftest) and the UI
// server calls on boot: it FAILS CLOSED unless every required schema exists AND
// the MOCK_ONLY fixture validates against every schema.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { validate, REQUIRED_SCHEMAS, presentSchemas, FILE_SCHEMA, FOLDER_SCHEMA } from "./validate.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE_FG = join(HERE, "fixture", "mock-project", ".foundergate");

export function runSchemaFirstGate() {
  const problems = [];

  // 1. Every required schema must exist.
  const present = new Set(presentSchemas());
  for (const s of REQUIRED_SCHEMAS) {
    if (!present.has(s)) problems.push(`missing schema: ${s}`);
  }

  // 2. The fixture must validate against every file schema.
  for (const [file, schema] of Object.entries(FILE_SCHEMA)) {
    const p = join(FIXTURE_FG, file);
    if (!existsSync(p)) {
      problems.push(`fixture missing ${file}`);
      continue;
    }
    const { valid, errors } = validate(JSON.parse(readFileSync(p, "utf8")), schema);
    if (!valid) problems.push(`fixture ${file} invalid: ${errors.join("; ")}`);
  }

  // 3. Fixture folder entries must validate against their entry schema.
  for (const [folder, schema] of Object.entries(FOLDER_SCHEMA)) {
    const dir = join(FIXTURE_FG, folder);
    if (!existsSync(dir)) {
      problems.push(`fixture missing folder ${folder}/`);
      continue;
    }
    for (const f of readdirSync(dir).filter((n) => n.endsWith(".json"))) {
      const { valid, errors } = validate(JSON.parse(readFileSync(join(dir, f), "utf8")), schema);
      if (!valid) problems.push(`fixture ${folder}/${f} invalid: ${errors.join("; ")}`);
    }
  }

  return { pass: problems.length === 0, problems };
}

// CLI: exit non-zero if the gate fails (fail-closed). "No schema, no UI."
const invokedDirectly =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (invokedDirectly) {
  const { pass, problems } = runSchemaFirstGate();
  if (pass) {
    console.log("SCHEMA-FIRST-GATE: PASS (all schemas exist; fixture validates). UI may proceed.");
    process.exit(0);
  }
  console.error("SCHEMA-FIRST-GATE: FAIL — No schema, no UI.");
  for (const p of problems) console.error("  - " + p);
  process.exit(1);
}
