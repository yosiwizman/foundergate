// FounderGate V8-A1 — attached-project registry selftest (hermetic, offline).
//
// Proves: attach ONE repo works; attaching a SECOND different repo is REJECTED;
// attaching a folder without .foundergate/ is REJECTED; and attach is read-only
// (it creates no files in the attached repo).

import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { ProjectRegistry, AttachError } from "./registry.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE_ROOT = join(HERE, "fixture", "mock-project");

let passed = 0;
function check(name, fn) {
  fn();
  passed++;
  console.log(`  PASS: ${name}`);
}

function makeRepo(withFg) {
  const root = mkdtempSync(join(tmpdir(), "v8a1-repo-"));
  if (withFg) mkdirSync(join(root, ".foundergate"), { recursive: true });
  return root;
}

check("attach one repo (the fixture) works", () => {
  const reg = new ProjectRegistry();
  assert.equal(reg.attach(FIXTURE_ROOT), FIXTURE_ROOT);
  assert.equal(reg.current(), FIXTURE_ROOT);
});

check("re-attaching the SAME repo is idempotent", () => {
  const reg = new ProjectRegistry();
  reg.attach(FIXTURE_ROOT);
  assert.doesNotThrow(() => reg.attach(FIXTURE_ROOT));
});

check("attaching a SECOND different repo is REJECTED", () => {
  const reg = new ProjectRegistry();
  const second = makeRepo(true);
  try {
    reg.attach(FIXTURE_ROOT);
    assert.throws(() => reg.attach(second), (e) => e instanceof AttachError && /exactly ONE/.test(e.message));
  } finally {
    rmSync(second, { recursive: true, force: true });
  }
});

check("attaching a folder without .foundergate/ is REJECTED", () => {
  const reg = new ProjectRegistry();
  const bare = makeRepo(false);
  try {
    assert.throws(() => reg.attach(bare), (e) => e instanceof AttachError && /no \.foundergate/.test(e.message));
  } finally {
    rmSync(bare, { recursive: true, force: true });
  }
});

check("attach is read-only (creates no files in the repo)", () => {
  const reg = new ProjectRegistry();
  const repo = makeRepo(true);
  try {
    const before = readdirSync(repo).sort();
    const beforeFg = readdirSync(join(repo, ".foundergate")).sort();
    reg.attach(repo);
    assert.deepEqual(readdirSync(repo).sort(), before, "attach wrote into repo root");
    assert.deepEqual(readdirSync(join(repo, ".foundergate")).sort(), beforeFg, "attach wrote into .foundergate");
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

console.log(`\nV8A1-REGISTRY-SELFTEST: PASS (${passed} checks)`);
