// FounderGate — MECHANICAL critical-path gate guard (anti-repeat for the Run-6 abort).
//
// Run 6 was aborted because a parked defect (L0 — the café "Send" button below the
// preview embed frame) sat ON step 2 of the stranger script, yet the launcher started
// the session anyway: "no parked defect on the critical path" was a human promise, not
// a machine check. This guard locks the fix: the launcher now parses the parked-notes
// register against the critical-path manifest and REFUSES to start on a match. Here we
// prove that logic — including that it fires on the CURRENT product (L0 is live).

import assert from "node:assert";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import {
  criticalPathBlockers, loadJson, MANIFEST_PATH, PARKED_NOTES_PATH,
} from "../../scripts/start-stranger-test.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");
const LAUNCHER = readFileSync(join(REPO, "scripts", "start-stranger-test.mjs"), "utf8");

let pass = 0;
const check = (name, fn) => { fn(); console.log(`  PASS: ${name}`); pass++; };

console.log("== mechanical critical-path gate ==");

const manifest = loadJson(MANIFEST_PATH);
const parked = loadJson(PARKED_NOTES_PATH);

check("the manifest and parked-notes files load and are well-formed", () => {
  assert.ok(Array.isArray(manifest.steps) && manifest.steps.length >= 7, "manifest must list the stranger-script steps");
  for (const s of manifest.steps) for (const f of ["stepKey", "critical"]) assert.ok(f in s, `manifest step missing ${f}`);
  assert.ok(Array.isArray(parked.notes), "parked-notes must have a notes[] array");
  for (const n of parked.notes) for (const f of ["id", "stepKey", "summary", "waived"]) assert.ok(f in n, `parked note missing ${f}`);
});

check("EVERY parked note references a real manifest stepKey (no orphan notes)", () => {
  const keys = new Set(manifest.steps.map((s) => s.stepKey));
  for (const n of parked.notes) assert.ok(keys.has(n.stepKey), `parked note "${n.id}" has unknown stepKey "${n.stepKey}"`);
});

check("the live register is CLEAR (L0 resolved in FD-IMPLEMENT) — no critical-path blocker now", () => {
  // L0 was the live blocker; FD-IMPLEMENT fixed it (the embed grows with content), so
  // the register is clear and the launcher may start a session again.
  const blockers = criticalPathBlockers(manifest, parked);
  assert.equal(blockers.length, 0, `expected a clear register, got blockers: ${blockers.map((b) => b.id).join(", ")}`);
  // the resolution is recorded, not silently dropped.
  assert.ok(Array.isArray(parked.resolved) && parked.resolved.some((r) => r.id === "L0-preview-send-clipped"), "L0 resolution must be recorded in parked-notes.resolved");
});

check("a WAIVED note does not block; a note on a NON-critical step does not block", () => {
  const m = { steps: [{ stepKey: "preview", critical: true }, { stepKey: "cosmetic", critical: false }] };
  assert.equal(criticalPathBlockers(m, { notes: [{ id: "x", stepKey: "preview", waived: true }] }).length, 0, "waived note must not block");
  assert.equal(criticalPathBlockers(m, { notes: [{ id: "y", stepKey: "cosmetic", waived: false }] }).length, 0, "non-critical step must not block");
  assert.equal(criticalPathBlockers(m, { notes: [{ id: "z", stepKey: "preview", waived: false }] }).length, 1, "unwaived critical note must block");
});

check("the launcher actually refuses to start on a blocker (not just computes it)", () => {
  assert.ok(/criticalPathBlockers\(/.test(LAUNCHER), "main() must call criticalPathBlockers");
  assert.ok(/SESSION BLOCKED/.test(LAUNCHER), "launcher must announce SESSION BLOCKED");
  assert.ok(/if \(blockers\.length\)[\s\S]*?process\.exit\(1\)/.test(LAUNCHER), "launcher must exit(1) inside the blockers branch");
  // the gate must run BEFORE the servers are started (startAll)
  assert.ok(LAUNCHER.indexOf("criticalPathBlockers(loadJson") < LAUNCHER.indexOf("startAll(SESSION_ROOT)"), "the gate must run before startAll");
});

console.log(`\nV8-CRITICAL-PATH-GATE: PASS ${pass}`);
