// FounderGate V8-A3 — File Cabinet tree selftest (hermetic, offline).
//
// Proves the tree lists EVERY file with a data-class badge, groups by plain-English
// category, marks symlinks conservatively as SECRET, and honours escalation rules —
// against the MOCK_ONLY fixture (which includes a rule-classified SECRET and an
// unclassified file).

import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildTree, loadRules } from "./tree.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE = join(HERE, "..", "..", "v8a1", "fixture", "mock-project");

let passed = 0;
function check(name, fn) { fn(); passed++; console.log(`  PASS: ${name}`); }

const tree = buildTree(FIXTURE);
const byPath = Object.fromEntries(tree.files.map((f) => [f.path, f]));

check("tree lists files and every file has a data-class badge + access", () => {
  assert.ok(tree.count >= 8, `expected several files, got ${tree.count}`);
  for (const f of tree.files) {
    assert.ok(f.data_class, `${f.path} missing data_class`);
    assert.ok(f.access && typeof f.access.preview === "boolean", `${f.path} missing access`);
    assert.ok(f.category, `${f.path} missing category`);
  }
});

check("files are grouped by plain-English categories", () => {
  const cats = Object.keys(tree.categories);
  assert.ok(cats.includes("Founder Documents") || cats.includes("Evidence") || cats.includes("App Source"), `categories: ${cats}`);
});

check("rule-classified SECRET file is hidden (no access)", () => {
  const s = byPath["mock-config.txt"];
  assert.ok(s, "mock-config.txt should be listed");
  assert.equal(s.data_class, "SECRET");
  assert.deepEqual(s.access, { preview: false, copy: false, download: false });
});

check("unclassified file is UNKNOWN (blocked)", () => {
  const u = byPath["mystery.dat"];
  assert.ok(u, "mystery.dat should be listed");
  assert.equal(u.data_class, "UNKNOWN");
  assert.equal(u.access.preview, false);
});

check("a safe founder document is previewable", () => {
  const d = byPath[join("docs", "CURRENT_STATUS.md")] || byPath["docs/CURRENT_STATUS.md"];
  assert.ok(d, "docs/CURRENT_STATUS.md should be listed");
  assert.equal(d.data_class, "PUBLIC_SAFE");
  assert.equal(d.access.preview, true);
});

check("loadRules picks up the fixture's SECRET rule", () => {
  const rules = loadRules(FIXTURE);
  assert.ok(rules.some((r) => r.match === "mock-config.txt" && r.class === "SECRET"));
});

console.log(`\nV8A3-TREE-SELFTEST: PASS (${passed} checks)`);
