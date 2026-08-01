// Self-test (dependency-free node): with a full truthful input the founder view
// composes ALL sections, renderFounderViewText returns a non-empty screen that
// mentions every section, and each section value EQUALS what the underlying
// audited module produces (compose, do not reinvent).
//
// Run: node src/ui/founder-view/founder-view.selftest.mjs

import assert from "node:assert/strict";
import { buildFounderView, renderFounderViewText, UNKNOWN } from "./founder-view.mjs";
import { buildCards } from "../dashboard/status-cards.mjs";
import { buildCommandCenter } from "../command-center/command-center.mjs";
import { buildConsoleView, buildDoctorChecklist } from "../../autonomous-run/console/run-console.mjs";
import { buildIntakeView } from "../../founder_url_drop/intake/url-intake.mjs";
import { buildDrawer } from "../../founder_url_drop/evidence_drawer/evidence-drawer.mjs";
import { buildDecisionPackage } from "../../evidence/decision-package/decision-package.mjs";

let passed = 0;
const TOTAL = 12;
function check(name, fn) {
  fn();
  passed += 1;
  console.log(`ok  - ${name}`);
}

// A full, truthful, present input covering every section.
const nowMs = 1_700_000_000_000;
const runId = "run-abc123";
const SHA = "a".repeat(64);
const input = {
  runId,
  state: { state: "RUNNING" },
  handoff: { result: "LAUNCHED" },
  heartbeat: { ts: nowMs }, // fresh -> LIVE
  events: [{ run_id: runId }, { run_id: "other" }, {}],
  evidence: [{ label: "ci-log", ts: nowMs }],
  nowMs,
  url: "https://github.com/acme/widget",
  presence: { git: true, gh: true, node: true, npm: true, zip: true, unzip: true, shasum: true, python3: true },
  safetyResult: { verdict: "PASS", url: "https://github.com/acme/widget" },
  evidencePack: { manifest_sha256: SHA, entries: [{ label: "readme", value: "hello", class: "PUBLIC" }] },
  decision: {
    verdict: "OBSERVED",
    claims: [{ name: "boots", status: "PROVEN" }, { name: "logs", status: "OBSERVED" }],
    limitations: ["single sample run"],
    evidence_sha256: SHA,
    run_id: runId,
  },
};

const view = buildFounderView(input);

check("composes all seven sections (none UNKNOWN)", () => {
  for (const key of ["statusCards", "commandCenter", "console", "doctor", "intake", "drawer", "decision"]) {
    assert.notEqual(view[key], UNKNOWN, `${key} should be composed, not UNKNOWN`);
    assert.ok(view[key] && typeof view[key] === "object", `${key} should be an object`);
  }
});

check("unknowns is empty for full input", () => {
  assert.ok(Array.isArray(view.unknowns));
  assert.equal(view.unknowns.length, 0);
});

// Each section must EQUAL the audited child module's own output — no reinvention.
check("statusCards equals buildCards output", () => {
  assert.deepEqual(view.statusCards, buildCards({ runId, state: input.state, handoff: input.handoff, heartbeat: input.heartbeat, nowMs }));
});
check("commandCenter equals buildCommandCenter output", () => {
  assert.deepEqual(view.commandCenter, buildCommandCenter({ runId, state: input.state, handoff: input.handoff, heartbeat: input.heartbeat, events: input.events, evidence: input.evidence, nowMs }));
});
check("console equals buildConsoleView output", () => {
  assert.deepEqual(view.console, buildConsoleView({ runId, state: input.state, handoff: input.handoff, heartbeat: input.heartbeat, events: input.events, nowMs }));
});
check("doctor equals buildDoctorChecklist output", () => {
  assert.deepEqual(view.doctor, buildDoctorChecklist(input.presence));
});
check("intake equals buildIntakeView output", () => {
  assert.deepEqual(view.intake, buildIntakeView(input.url));
});
check("drawer equals buildDrawer output", () => {
  assert.deepEqual(view.drawer, buildDrawer({ safetyResult: input.safetyResult, evidencePack: input.evidencePack }));
});
check("decision equals buildDecisionPackage output", () => {
  assert.deepEqual(view.decision, buildDecisionPackage({ verdict: input.decision.verdict, claims: input.decision.claims, limitations: input.decision.limitations, evidence_sha256: input.decision.evidence_sha256, run_id: input.decision.run_id }));
});

// The rendered screen must be a non-empty string naming every section.
const text = renderFounderViewText(view);
check("renderFounderViewText returns a non-empty string", () => {
  assert.equal(typeof text, "string");
  assert.ok(text.length > 0);
});
check("rendered screen contains every section header", () => {
  for (const label of ["STATUS CARDS", "COMMAND CENTER", "LIVE RUN CONSOLE", "INSTALL DOCTOR", "URL INTAKE", "EVIDENCE DRAWER", "DECISION PACKAGE"]) {
    assert.ok(text.includes(label), `missing section header: ${label}`);
  }
});
check("rendered screen carries the child modules' real content", () => {
  // Truthful evidence made it into the composite (delegated, not faked).
  assert.ok(text.includes(runId), "run id should appear");
  assert.ok(text.includes(SHA), "evidence sha should appear");
  assert.ok(text.includes("Install Doctor"), "doctor title should appear");
});

assert.equal(passed, TOTAL, `expected ${TOTAL} checks`);
console.log(`\nPASSED ${passed}/${TOTAL}`);
process.exit(0);
