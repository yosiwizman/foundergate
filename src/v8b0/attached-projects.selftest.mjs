// FounderGate V8-B VB0 — Attached Projects Registry core + persistence + schema proof.

import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  emptyRegistry, loadRegistry, saveRegistry, attach, detach, setActive, activeRoot, list,
  projectId, canonicalRoot, UNKNOWN, SCHEMA_VERSION,
} from "./attached-projects.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
let pass = 0;
const check = (name, fn) => { fn(); pass++; console.log(`  PASS: ${name}`); };

// make a throwaway project dir that contains a .foundergate/ folder.
function mkProject() { const p = mkdtempSync(join(tmpdir(), "vb0-proj-")); mkdirSync(join(p, ".foundergate")); return p; }

console.log("== VB0 attached-projects registry ==");

check("emptyRegistry is schema-shaped: version, empty projects, no active", () => {
  const r = emptyRegistry();
  assert.equal(r.schema_version, SCHEMA_VERSION);
  assert.deepEqual(r.projects, []);
  assert.equal(r.active_id, null);
});

check("attach records a real project (paths/metadata only, no content) and is idempotent", () => {
  const a = mkProject();
  let reg = emptyRegistry();
  const r1 = attach(reg, a, { name: "Alpha", attached_at: "2026-07-11T00:00:00Z" });
  assert.equal(reg.projects.length, 1);
  assert.equal(reg.projects[0].id, projectId(a));
  assert.equal(reg.projects[0].root, canonicalRoot(a)); // stored root is the realpath'd canonical
  assert.equal(reg.projects[0].name, "Alpha");
  // attaching the SAME root again is idempotent (same id, no duplicate)
  attach(reg, a);
  assert.equal(reg.projects.length, 1, "same root must not duplicate");
  // the stored record carries no file content — only id/root/name/attached_at keys
  assert.deepEqual(Object.keys(reg.projects[0]).sort(), ["attached_at", "id", "name", "root"]);
  void r1;
});

check("attach REJECTS a path with no .foundergate/ (honest error, not a silent attach)", () => {
  const bare = mkdtempSync(join(tmpdir(), "vb0-bare-"));
  assert.throws(() => attach(emptyRegistry(), bare), /no \.foundergate/);
});

check("setActive requires an existing id; activeRoot returns the chosen root", () => {
  const a = mkProject();
  const reg = emptyRegistry();
  const { id } = attach(reg, a);
  assert.throws(() => setActive(reg, "pdeadbeef"), /unknown project id/);
  setActive(reg, id);
  assert.equal(activeRoot(reg), canonicalRoot(a));
  assert.equal(list(reg).find((x) => x.id === id).active, true);
});

check("detach removes the project and clears active if it was active (no dangling active)", () => {
  const a = mkProject();
  const reg = emptyRegistry();
  const { id } = attach(reg, a);
  setActive(reg, id);
  detach(reg, id);
  assert.equal(reg.projects.length, 0);
  assert.equal(reg.active_id, null);
  assert.equal(activeRoot(reg), UNKNOWN);
});

check("persistence round-trips through disk (save -> load is identical)", () => {
  const a = mkProject(), b = mkProject();
  const reg = emptyRegistry();
  attach(reg, a, { name: "Alpha", attached_at: "2026-07-11T00:00:00Z" });
  const { id } = attach(reg, b, { name: "Beta", attached_at: "2026-07-11T00:00:00Z" });
  setActive(reg, id);
  const path = join(mkdtempSync(join(tmpdir(), "vb0-reg-")), "attached-projects.json");
  saveRegistry(path, reg);
  assert.ok(existsSync(path));
  const back = loadRegistry(path);
  assert.deepEqual(back, reg);
  assert.equal(activeRoot(back), canonicalRoot(b));
});

check("the registry conforms to its committed JSON schema", () => {
  const schema = JSON.parse(readFileSync(join(HERE, "schemas", "attached_projects.schema.json"), "utf8"));
  const req = schema.required;
  assert.deepEqual(req.sort(), ["active_id", "projects", "schema_version"]);
  const a = mkProject();
  const reg = emptyRegistry(); const { id } = attach(reg, a); setActive(reg, id);
  // required top-level keys present
  for (const k of req) assert.ok(k in reg, `registry missing required ${k}`);
  // id pattern from the schema holds
  const idPat = new RegExp(schema.properties.projects.items.properties.id.pattern);
  assert.ok(idPat.test(reg.projects[0].id), `id ${reg.projects[0].id} must match schema pattern`);
  // version pattern
  assert.ok(new RegExp(schema.properties.schema_version.pattern).test(reg.schema_version));
});

console.log(`\nV8B0-ATTACHED-PROJECTS-SELFTEST: PASS (${pass} checks)`);
