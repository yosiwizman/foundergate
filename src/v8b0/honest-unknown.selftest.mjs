// FounderGate V8-B VB0 — ISOLATION PROOF: Law-54 honest UNKNOWN.
//
// When a project can't be read, VB0 must say UNKNOWN — never another project, never a
// guess, never invented state. The checker's job is to get a non-UNKNOWN answer out of
// an unreadable/absent active project.

import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { emptyRegistry, attach, setActive, detach, activeRoot, UNKNOWN } from "./attached-projects.mjs";

let pass = 0;
const check = (name, fn) => { fn(); pass++; console.log(`  PASS: ${name}`); };
function mkProject() { const p = mkdtempSync(join(tmpdir(), "vb0-proj-")); mkdirSync(join(p, ".foundergate")); return p; }

console.log("== VB0 isolation proof: Law-54 honest UNKNOWN ==");

check("no active project chosen → UNKNOWN", () => {
  assert.equal(activeRoot(emptyRegistry()), UNKNOWN);
});

check("active project whose .foundergate becomes UNREADABLE → UNKNOWN (not another project)", () => {
  const a = mkProject(), b = mkProject();
  const reg = emptyRegistry();
  const ida = attach(reg, a).id; attach(reg, b);
  setActive(reg, ida);
  assert.notEqual(activeRoot(reg), UNKNOWN); // readable now
  rmSync(join(a, ".foundergate"), { recursive: true, force: true }); // its .foundergate disappears
  assert.equal(activeRoot(reg), UNKNOWN, "must be UNKNOWN, never fall back to project B");
});

check("active_id pointing at a DETACHED project → UNKNOWN", () => {
  const a = mkProject();
  const reg = emptyRegistry();
  const id = attach(reg, a).id; setActive(reg, id);
  // detach clears active; force a dangling active to prove activeRoot still says UNKNOWN
  detach(reg, id);
  reg.active_id = id; // rogue dangling pointer
  assert.equal(activeRoot(reg), UNKNOWN);
});

check("active project pointing at a path that never existed → UNKNOWN", () => {
  const reg = emptyRegistry();
  reg.projects.push({ id: "pghost", root: "/nonexistent/ghost/project", name: "ghost", attached_at: null });
  reg.active_id = "pghost";
  assert.equal(activeRoot(reg), UNKNOWN);
});

console.log(`\nV8B0-HONEST-UNKNOWN-SELFTEST: PASS (${pass} checks)`);
