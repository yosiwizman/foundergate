// FounderGate V8-A1 — Cannot-Invent-State CI test (Law 54).
//
// "The dashboard must never invent state. status.json missing -> UNKNOWN /
//  NOT CONNECTED. CI unavailable -> CI UNKNOWN. PR unavailable -> PR UNKNOWN.
//  Stale evidence -> STALE. This test runs in CI against every dashboard build."
//
// It builds models from deliberately-incomplete .foundergate folders and asserts
// the reader reports UNKNOWN / NOT CONNECTED / STALE and NEVER fabricates a
// green/passing/ready value from an absent source.

import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildModel, UNKNOWN, NOT_CONNECTED } from "./reader.mjs";

let passed = 0;
function check(name, fn) {
  fn();
  passed++;
  console.log(`  PASS: ${name}`);
}

// Build a temp project with a .foundergate containing exactly the given files.
function makeProject(files) {
  const root = mkdtempSync(join(tmpdir(), "v8a1-cis-"));
  const fg = join(root, ".foundergate");
  mkdirSync(fg, { recursive: true });
  for (const [name, obj] of Object.entries(files)) {
    writeFileSync(join(fg, name), JSON.stringify(obj), "utf8");
  }
  return root;
}
function withProject(files, fn) {
  const root = makeProject(files);
  try { fn(buildModel(root)); } finally { rmSync(root, { recursive: true, force: true }); }
}

check("missing status.json → state NOT CONNECTED (never invented)", () => {
  withProject({ "project.json": { schema_version: "1.0.0", project_id: "p", name: "P" } }, (m) => {
    assert.equal(m.state, NOT_CONNECTED);
    // no fabricated headline
    assert.equal(m.answers[0].a, NOT_CONNECTED);
    assert.equal(m.answers[0].source, UNKNOWN);
  });
});

check("CI unavailable → CI UNKNOWN (not green)", () => {
  withProject({ "status.json": { schema_version: "1.0.0", project_id: "p", state: "active" } }, (m) => {
    assert.equal(m.ci, UNKNOWN);
    assert.notEqual(m.ci, "passing");
  });
});

check("PR unavailable → PR UNKNOWN", () => {
  withProject({ "status.json": { schema_version: "1.0.0", project_id: "p", state: "active" } }, (m) => {
    assert.equal(m.pr, UNKNOWN);
  });
});

check("stale evidence (fresh:false) → STALE", () => {
  const root = makeProject({ "status.json": { schema_version: "1.0.0", project_id: "p", state: "active" } });
  try {
    mkdirSync(join(root, ".foundergate", "evidence"), { recursive: true });
    writeFileSync(
      join(root, ".foundergate", "evidence", "old.json"),
      JSON.stringify({ evidence_id: "old", path: "x", fresh: false })
    );
    const m = buildModel(root);
    assert.equal(m.evidence.length, 1);
    assert.equal(m.evidence[0].label, "STALE");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

check("no absent source is ever answered with a green/ready value", () => {
  withProject({ "project.json": { schema_version: "1.0.0", project_id: "p", name: "P" } }, (m) => {
    const blob = JSON.stringify(m.answers);
    // With only project.json present, nothing may claim done/passing/ready/green.
    assert.ok(!/\b(passing|green|ready|done|complete)\b/i.test(blob), `fabricated positive: ${blob}`);
    // Absent sources must read UNKNOWN.
    assert.equal(m.answers[1].a, UNKNOWN); // do I need to do anything?
    assert.equal(m.answers[6].a, UNKNOWN); // what changed since last time?
  });
});

console.log(`\nV8A1-CANNOT-INVENT-STATE-SELFTEST: PASS (${passed} checks)`);
