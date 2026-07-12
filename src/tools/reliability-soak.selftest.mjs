// FounderGate — reliability soak accumulator proof (AKIOR-HARVEST #5).
//
// Proves the accumulator folds windows correctly AND that it can NEVER fabricate a soak:
// a PASS is emitted only when the run spans the claimed duration and meets the SLO, and
// the emitted PASS is VALID under §29's report-provenance validateSoakClaims — while a
// short/failed run yields an honest NOT-PASSED line that carries no "SOAK PASS".

import assert from "node:assert/strict";
import { newSoak, addWindow, slo, soakReport, passed } from "./reliability-soak.mjs";
import { validateSoakClaims } from "./report-provenance.mjs";

let pass = 0;
const check = (name, fn) => { fn(); pass++; console.log(`  PASS: ${name}`); };

console.log("== reliability soak accumulator (§29 rolling tool) ==");

// build a soak that runs from t0 for `hours`, one window/hour, all healthy.
function healthy(claimHours, hours, sloTarget = 0.99) {
  const soak = newSoak(claimHours, { sloTarget });
  for (let h = 0; h <= hours; h++) {
    const ts = new Date(Date.UTC(2026, 6, 11, h)).toISOString(); // fixed base, +h hours (data, not "now")
    addWindow(soak, { ts, ok: 60, fail: 0 });
  }
  return soak;
}

check("addWindow accumulates ok/fail and tracks span", () => {
  const s = slo(healthy(8, 9));
  assert.equal(s.samples, 60 * 10);
  assert.equal(s.fail, 0);
  assert.ok(Math.abs(s.spanHours - 9) < 1e-6, `span ~9h, got ${s.spanHours}`);
  assert.equal(s.meetsDuration, true);
  assert.equal(s.meetsSlo, true);
});

check("a run that SPANS the claim and meets SLO emits a VALID §29 SOAK PASS", () => {
  const soak = healthy(8, 9); // 9h span for an 8h claim
  const report = soakReport(soak, { sha: "abc1234" });
  assert.match(report, /FOUNDERGATE HARNESS 8-HOUR SOAK PASS/);
  assert.equal(passed(soak), true);
  // dogfood: the emitted report must be VALID under the soak-proof law
  const soaks = validateSoakClaims(report);
  assert.ok(soaks.length === 1 && soaks[0].ok, `emitted PASS must satisfy §29: ${JSON.stringify(soaks)}`);
});

check("a SHORT run NEVER emits 'SOAK PASS' — honest NOT-PASSED instead", () => {
  const soak = healthy(24, 3); // only 3h span for a 24h claim
  const report = soakReport(soak);
  assert.doesNotMatch(report, /SOAK PASS/);
  assert.match(report, /NOT PASSED/);
  assert.match(report, /span 3\.00h < claim 24h/);
  assert.equal(passed(soak), false);
  // §29 has nothing to flag because the tool refused to claim a pass.
  assert.equal(validateSoakClaims(report).length, 0);
});

check("SLO miss NEVER emits 'SOAK PASS' even if the duration is met", () => {
  const soak = newSoak(8, { sloTarget: 0.99 });
  for (let h = 0; h <= 9; h++) {
    const ts = new Date(Date.UTC(2026, 6, 11, h)).toISOString();
    addWindow(soak, { ts, ok: 90, fail: 10 }); // 90% availability < 99% SLO
  }
  const report = soakReport(soak);
  assert.doesNotMatch(report, /SOAK PASS/);
  assert.match(report, /availability .* < SLO/);
  assert.equal(passed(soak), false);
});

check("empty soak is honest (no samples), never a pass", () => {
  const soak = newSoak(8);
  assert.equal(passed(soak), false);
  assert.match(soakReport(soak), /no samples yet/);
});

console.log(`\nV8-RELIABILITY-SOAK: PASS ${pass}`);
