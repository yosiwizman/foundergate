// FounderGate V8-A2 — preview.json schema selftest (pass AND fail).

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { validate, PREVIEW_SCHEMA } from "./validate-preview.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE = join(HERE, "..", "..", "v8a1", "fixture", "mock-project", ".foundergate", "preview.json");

let passed = 0;
function check(name, fn) { fn(); passed++; console.log(`  PASS: ${name}`); }

check("fixture preview.json validates", () => {
  const cfg = JSON.parse(readFileSync(FIXTURE, "utf8"));
  const { valid, errors } = validate(cfg);
  assert.ok(valid, errors.join("; "));
  assert.equal(cfg.target, "static-preview");
  assert.equal(cfg.sends, "off");
});

check("target enum bites (only static-preview allowed)", () => {
  assert.equal(PREVIEW_SCHEMA.properties.target.enum.length, 1);
  const cfg = JSON.parse(readFileSync(FIXTURE, "utf8"));
  assert.equal(validate({ ...cfg, target: "shell-command" }).valid, false);
});

check("missing required field is rejected", () => {
  const cfg = JSON.parse(readFileSync(FIXTURE, "utf8"));
  delete cfg.sends;
  assert.equal(validate(cfg).valid, false);
});

check("bad enum (sends) is rejected", () => {
  const cfg = JSON.parse(readFileSync(FIXTURE, "utf8"));
  assert.equal(validate({ ...cfg, sends: "maybe" }).valid, false);
});

console.log(`\nV8A2-PREVIEW-SCHEMA-SELFTEST: PASS (${passed} checks)`);
