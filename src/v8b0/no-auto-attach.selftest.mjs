// FounderGate V8-B VB0 — ISOLATION PROOF: never auto-attach, never auto-select.
//
// The checker's job is to make a project attach or become active WITHOUT the founder
// explicitly doing it. This proof locks that shut: a missing/corrupt registry loads
// empty, attach() is the only add path, and activeRoot() is UNKNOWN until the founder
// setActive()s — never a default, never "the first project", never on corruption.

import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { loadRegistry, activeRoot, attach, emptyRegistry, UNKNOWN } from "./attached-projects.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = readFileSync(join(HERE, "attached-projects.mjs"), "utf8");
let pass = 0;
const check = (name, fn) => { fn(); pass++; console.log(`  PASS: ${name}`); };
function mkProject() { const p = mkdtempSync(join(tmpdir(), "vb0-proj-")); mkdirSync(join(p, ".foundergate")); return p; }

console.log("== VB0 isolation proof: no auto-attach / no auto-select ==");

check("a MISSING registry file loads EMPTY — nothing auto-attaches", () => {
  const r = loadRegistry(join(mkdtempSync(join(tmpdir(), "vb0-missing-")), "nope.json"));
  assert.deepEqual(r.projects, []);
  assert.equal(r.active_id, null);
  assert.equal(activeRoot(r), UNKNOWN);
});

check("a CORRUPT registry file loads EMPTY — corruption never auto-activates a project", () => {
  const path = join(mkdtempSync(join(tmpdir(), "vb0-corrupt-")), "attached.json");
  writeFileSync(path, "{ this is not json ]");
  const r = loadRegistry(path);
  assert.deepEqual(r.projects, []);
  assert.equal(activeRoot(r), UNKNOWN);
});

check("projects present but active_id null → activeRoot UNKNOWN (no auto-select of 'the first')", () => {
  const a = mkProject(), b = mkProject();
  const reg = emptyRegistry(); attach(reg, a); attach(reg, b);
  assert.equal(reg.active_id, null, "attach must NOT set active");
  assert.equal(activeRoot(reg), UNKNOWN, "must not auto-pick a project");
});

check("a rogue active_id pointing at no project → UNKNOWN (never falls back to another project)", () => {
  const a = mkProject();
  const reg = emptyRegistry(); attach(reg, a);
  reg.active_id = "pnonexistent";
  assert.equal(activeRoot(reg), UNKNOWN);
});

check("STATIC: attach() is the only add path — no code auto-pushes a project or auto-sets active", () => {
  // the only place reg.projects gets a push is inside attach(); active_id is only
  // assigned by setActive/detach(null) — never a default in load/activeRoot.
  const pushes = (SRC.match(/\.projects\.push\(/g) || []).length;
  assert.equal(pushes, 1, "there must be exactly ONE projects.push, inside attach()");
  assert.ok(!/active_id\s*=\s*reg\.projects\[0\]|active_id\s*=\s*.*\[0\]\.id/.test(SRC), "must never auto-select the first project");
  // loadRegistry keeps active_id ONLY if it names a surviving entry (else null) — a
  // corrupt/hand-crafted active_id can't auto-activate a project (Finding 4 hardening).
  assert.match(SRC, /projects\.some\(\(p\) => p\.id === r\.active_id\)/);
  assert.match(SRC, /active_id:\s*active/);
});

check("Finding 4 (LOW): a hand-crafted entry whose id != projectId(root) is DROPPED on load; a bogus active_id is cleared", () => {
  const a = mkProject();
  const path = join(mkdtempSync(join(tmpdir(), "vb0-forge-")), "attached.json");
  // a well-formed file that claims a BOGUS id for a real root and activates it
  writeFileSync(path, JSON.stringify({ schema_version: "1.0.0", projects: [{ id: "pbogus", root: a, name: "forged", attached_at: null }], active_id: "pbogus" }));
  const reg = loadRegistry(path);
  assert.equal(reg.projects.length, 0, "an entry with a mismatched id<->root binding must be dropped");
  assert.equal(reg.active_id, null, "a bogus active_id must be cleared");
  assert.equal(activeRoot(reg), UNKNOWN);
});

console.log(`\nV8B0-NO-AUTO-ATTACH-SELFTEST: PASS (${pass} checks)`);
