// FounderGate V8-A1 — dashboard view-model selftest (hermetic, offline, Node).
//
// Proves the UI RENDER LOGIC in Node (no browser needed in CI): the same pure
// view-model the browser uses. Covers A13–A23 render invariants + Law 44/54/55.

import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildView, buildDoctor, FAILURE_MODES, EIGHT_QUESTIONS } from "./view-model.mjs";
import { buildModel, UNKNOWN } from "../reader.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE_ROOT = join(HERE, "..", "fixture", "mock-project");

let passed = 0;
function check(name, fn) {
  fn();
  passed++;
  console.log(`  PASS: ${name}`);
}

const view = buildView(buildModel(FIXTURE_ROOT));

check("A19: exactly the 10 failure-mode lines, verbatim, in order", () => {
  assert.equal(FAILURE_MODES.length, 10);
  assert.equal(view.failureModes.length, 10);
  assert.equal(view.failureModes[0], "green CI ≠ product works");
  assert.equal(view.failureModes[9], "a local tool ≠ a business");
});

check("A13/Law44: 8 questions render in strict priority order", () => {
  assert.equal(view.questions.length, 8);
  view.questions.forEach((q, i) => assert.equal(q.q, EIGHT_QUESTIONS[i], `question ${i} out of order`));
});

check("A15/Law55: gate cards are view-only and NOT approvable", () => {
  assert.ok(view.gates.length >= 1);
  for (const g of view.gates) {
    assert.equal(g.viewOnly, true);
    assert.equal(g.approvable, false);
  }
});

check("A21: Panic Card honest scope (fixture idle → stops nothing running)", () => {
  assert.equal(view.panic.trackedCount, 0);
  assert.match(view.panic.scope, /stops nothing running/i);
  assert.equal(view.panic.honest, true);
});

check("A23: cost guard labeled policy/config only (no runtime enforcement)", () => {
  assert.match(view.cost.label, /policy\/config only/i);
  assert.match(view.cost.label, /runtime enforcement begins V8-B/i);
  assert.equal(view.cost.enforcement, "policy-display-only");
});

check("A22: data classification badge present (MOCK_ONLY fixture)", () => {
  assert.equal(view.dataBadges.projectClass, "MOCK_ONLY");
  assert.equal(view.dataBadges.hideSecretValues, true);
  assert.equal(view.dataBadges.blockUnknownFiles, true);
});

check("A20: Doctor panel reports files-present, never invented health", () => {
  assert.equal(view.doctor.version, "V8-A1");
  assert.equal(view.doctor.connected, true);
  assert.equal(view.doctor.filesPresent, "10/10");
});

check("A17: needs-you card is file-sourced", () => {
  assert.ok(view.needsYou.text && view.needsYou.text !== UNKNOWN);
  assert.match(view.needsYou.source, /status\.json/);
});

check("A18: do-not-touch card lists locked paths", () => {
  assert.ok(view.doNotTouch.items.length >= 1);
});

// A16 — disconnected project: CI/PR UNKNOWN, no fabricated green.
check("A16/Law54: disconnected project renders UNKNOWN, never green", () => {
  const v = buildView(buildModel("/nonexistent-project-root-xyz"));
  assert.equal(v.header.connected, false);
  assert.equal(v.ciUnknown, true);
  assert.equal(v.prUnknown, true);
  assert.equal(v.statusCard.ci.kind, "unknown");
  const blob = JSON.stringify(v.statusCard);
  assert.ok(!/\b(passing|green|ready)\b/i.test(blob), `fabricated positive: ${blob}`);
});

check("buildDoctor is pure and counts presence", () => {
  const d = buildDoctor({ connected: true, presence: { project: true, status: true } });
  assert.equal(d.filesPresent, "2/10");
});

console.log(`\nV8A1-VIEW-MODEL-SELFTEST: PASS (${passed} checks)`);
