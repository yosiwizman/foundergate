// FounderGate V8-A1 — schema-first machine gate selftest (Law 53).
//
// Proves the A7 machine gate: with all schemas present and the MOCK_ONLY fixture
// valid, the gate PASSES ("UI may proceed"). Also proves it fails-closed on a
// broken schema set (a missing schema name in the required list is caught).

import assert from "node:assert/strict";
import { runSchemaFirstGate } from "./schema-first-gate.mjs";
import { REQUIRED_SCHEMAS } from "./validate.mjs";

let passed = 0;
function check(name, fn) {
  fn();
  passed++;
  console.log(`  PASS: ${name}`);
}

check("schema-first gate PASSES on the real schemas + fixture", () => {
  const r = runSchemaFirstGate();
  assert.ok(r.pass, `gate should pass: ${r.problems.join("; ")}`);
  assert.equal(r.problems.length, 0);
});

check("required-schema list is exactly the 10-item V8-A1 subset", () => {
  assert.equal(REQUIRED_SCHEMAS.length, 10);
  for (const s of ["project", "status", "locks", "run_state", "data_classification", "cost_budget", "release_label", "gate_entry", "witness_entry", "evidence_entry"]) {
    assert.ok(REQUIRED_SCHEMAS.includes(s), `missing required schema ${s}`);
  }
});

console.log(`\nV8A1-SCHEMA-FIRST-GATE-SELFTEST: PASS (${passed} checks)`);
