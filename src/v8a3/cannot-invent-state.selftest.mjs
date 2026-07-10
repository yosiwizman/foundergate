// FounderGate V8-A3 — Cannot-Invent-State proof for File Cabinet surfaces (AC1).
//
// Law 54 carried into V8-A3: the File Cabinet must never invent state. Unknown
// files are BLOCKED (not assumed safe); no SECRET/UNKNOWN/PRODUCTION_DATA file is
// ever marked previewable; a missing file yields a blocked object, not fabricated
// content.

import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildTree } from "./filecabinet/tree.mjs";
import { safePreview } from "./filecabinet/cabinet.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE = join(HERE, "..", "v8a1", "fixture", "mock-project");

let passed = 0;
function check(name, fn) { fn(); passed++; console.log(`  PASS: ${name}`); }

const tree = buildTree(FIXTURE);

check("every file the tree lists has an explicit data class (never blank/invented)", () => {
  for (const f of tree.files) assert.ok(f.data_class && f.data_class.length > 0, `${f.path} has no class`);
});

check("no SECRET/UNKNOWN/PRODUCTION_DATA file is marked previewable/copyable/downloadable", () => {
  for (const f of tree.files) {
    if (["SECRET", "UNKNOWN", "PRODUCTION_DATA"].includes(f.data_class)) {
      assert.equal(f.access.preview, false, `${f.path} must not be previewable`);
      assert.equal(f.access.copy, false);
      assert.equal(f.access.download, false);
    }
  }
});

check("unknown files exist in the fixture and are BLOCKED (blocked-until-classified)", () => {
  const unknowns = tree.files.filter((f) => f.data_class === "UNKNOWN");
  assert.ok(unknowns.length >= 1, "expected at least one unknown/blocked file");
  for (const u of unknowns) assert.equal(u.access.preview, false);
});

check("a missing file yields a blocked object, not fabricated content", () => {
  const r = safePreview(FIXTURE, "does/not/exist.md", []);
  assert.equal(r.allowed, false);
  assert.ok(!("content" in r));
});

check("a SECRET file never returns content", () => {
  const r = safePreview(FIXTURE, "mock-config.txt", []);
  assert.equal(r.allowed, false);
  assert.ok(!("content" in r));
});

console.log(`\nV8A3-CANNOT-INVENT-STATE-SELFTEST: PASS (${passed} checks)`);
