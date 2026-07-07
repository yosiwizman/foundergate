// FounderGate V8-A1 — schema validator selftest (hermetic, offline).
//
// Proves BOTH directions (Law 53 needs a validator that actually bites):
//   1. All 10 required schemas exist and are valid JSON.
//   2. Every MOCK_ONLY fixture .foundergate file VALIDATES against its schema.
//   3. Deliberately-broken variants are REJECTED (missing required, bad enum,
//      additional property, wrong const for view_only / cost enforcement).
//   4. The folder entries (gates/witnesses/evidence) validate.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  validate,
  loadSchema,
  presentSchemas,
  REQUIRED_SCHEMAS,
  FILE_SCHEMA,
} from "./validate.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const FG = join(HERE, "fixture", "mock-project", ".foundergate");
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));

let passed = 0;
function check(name, fn) {
  fn();
  passed++;
  console.log(`  PASS: ${name}`);
}

// 1. All required schemas present + valid JSON.
check("all 10 required schemas exist and parse", () => {
  const present = new Set(presentSchemas());
  for (const s of REQUIRED_SCHEMAS) {
    assert.ok(present.has(s), `missing schema: ${s}`);
    assert.ok(loadSchema(s).title, `schema ${s} has no title`);
  }
  assert.equal(REQUIRED_SCHEMAS.length, 10);
});

// 2. Every fixture file validates against its schema (PASS direction).
check("every fixture .foundergate file validates", () => {
  for (const [file, schema] of Object.entries(FILE_SCHEMA)) {
    const { valid, errors } = validate(readJson(join(FG, file)), schema);
    assert.ok(valid, `${file} should validate: ${errors.join("; ")}`);
  }
});

check("fixture folder entries validate (gate/witness/evidence)", () => {
  assert.ok(validate(readJson(join(FG, "gates", "g1-example.json")), "gate_entry").valid);
  assert.ok(validate(readJson(join(FG, "witnesses", "w1-example.json")), "witness_entry").valid);
  assert.ok(validate(readJson(join(FG, "evidence", "e1-example.json")), "evidence_entry").valid);
  assert.ok(validate(readJson(join(FG, "evidence", "e2-stale-example.json")), "evidence_entry").valid);
});

// 3. FAIL direction — the validator must reject bad shapes.
check("missing required field is rejected", () => {
  const p = readJson(join(FG, "project.json"));
  delete p.project_id;
  assert.equal(validate(p, "project").valid, false);
});

check("bad enum value is rejected", () => {
  const s = readJson(join(FG, "status.json"));
  s.ci = "green"; // not in enum (passing/failing/pending/UNKNOWN)
  const r = validate(s, "status");
  assert.equal(r.valid, false);
  assert.ok(r.errors.some((e) => /not in enum/.test(e)));
});

check("additional property is rejected", () => {
  const p = readJson(join(FG, "project.json"));
  p.executionAuthority = "full";
  assert.equal(validate(p, "project").valid, false);
});

check("gate view_only:false is rejected (Law 55 const bites)", () => {
  const g = readJson(join(FG, "gates", "g1-example.json"));
  g.view_only = false;
  const r = validate(g, "gate_entry");
  assert.equal(r.valid, false);
  assert.ok(r.errors.some((e) => /const/.test(e)));
});

check("cost enforcement other than policy-display-only is rejected", () => {
  const c = readJson(join(FG, "cost_budget.json"));
  c.enforcement = "runtime"; // V8-A1 forbids runtime enforcement
  assert.equal(validate(c, "cost_budget").valid, false);
});

check("bad date-time is rejected", () => {
  const s = readJson(join(FG, "status.json"));
  s.updated_at = "last tuesday";
  assert.equal(validate(s, "status").valid, false);
});

console.log(`\nV8A1-VALIDATOR-SELFTEST: PASS (${passed} checks)`);
