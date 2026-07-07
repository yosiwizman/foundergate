// FounderGate V8-A1 — reader selftest (hermetic, offline).
//
// Proves the reader builds an honest dashboard model from the MOCK_ONLY fixture
// and answers all 8 founder priority questions in strict order from real files.

import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildModel, UNKNOWN, NOT_CONNECTED } from "./reader.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE_ROOT = join(HERE, "fixture", "mock-project");

let passed = 0;
function check(name, fn) {
  fn();
  passed++;
  console.log(`  PASS: ${name}`);
}

const EIGHT_QUESTIONS = [
  "What is happening?",
  "Do I need to do anything?",
  "Is anything dangerous?",
  "What is blocked?",
  "What can I safely test?",
  "What must not be touched?",
  "What changed since last time?",
  "Where is the evidence?",
];

check("fixture model is connected and reads real files", () => {
  const m = buildModel(FIXTURE_ROOT);
  assert.equal(m.connected, true);
  assert.equal(m.state, "blocked");
  assert.equal(m.ci, "passing");
  assert.equal(m.pr, "#7");
  assert.equal(m.releaseLabel, "dev");
  assert.equal(m.dataClass, "MOCK_ONLY");
});

check("all 8 priority questions present in strict order", () => {
  const m = buildModel(FIXTURE_ROOT);
  assert.equal(m.answers.length, 8);
  m.answers.forEach((a, i) => assert.equal(a.q, EIGHT_QUESTIONS[i], `question ${i} out of order`));
  // every answer traces to a source
  for (const a of m.answers) assert.ok(a.source, "answer missing source");
});

check("do-not-touch derives from locks (2 items)", () => {
  const m = buildModel(FIXTURE_ROOT);
  assert.equal(m.doNotTouch.length, 2);
  assert.ok(m.doNotTouch.some((d) => d.path === ".foundergate/"));
});

check("evidence freshness: one FRESH, one STALE", () => {
  const m = buildModel(FIXTURE_ROOT);
  const labels = m.evidence.map((e) => e.label).sort();
  assert.deepEqual(labels, ["FRESH", "STALE"]);
});

check("panic card honest scope: idle fixture stops nothing running", () => {
  const m = buildModel(FIXTURE_ROOT);
  assert.equal(m.panic.trackedProcesses.length, 0);
  assert.match(m.panic.scope, /stops nothing running/i);
});

check("gates are view-only (Law 55)", () => {
  const m = buildModel(FIXTURE_ROOT);
  assert.ok(m.gates.length >= 1);
  for (const g of m.gates) assert.equal(g.viewOnly, true);
});

check("empty project root → not connected, no invented state", () => {
  const dir = mkdtempSync(join(tmpdir(), "v8a1-empty-"));
  try {
    const m = buildModel(dir);
    assert.equal(m.connected, false);
    assert.equal(m.state, NOT_CONNECTED);
    assert.equal(m.ci, UNKNOWN);
    assert.equal(m.pr, UNKNOWN);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

console.log(`\nV8A1-READER-SELFTEST: PASS (${passed} checks)`);
