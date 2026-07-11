// FounderGate — FIXTURE-WRITE-SAFETY guard (anti-repeat; makes committed-fixture
// writes IMPOSSIBLE, not merely caught).
//
// The committed mock fixture was twice written to by a live server started without
// an explicit FG_PROJECT_ROOT. This guard proves every server now DEFAULTS to a
// throwaway temp COPY (never the committed fixture), while an explicit
// FG_PROJECT_ROOT still works for tests/launcher.

import assert from "node:assert";
import { readFileSync, existsSync, rmSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { defaultProjectRoot, COMMITTED_FIXTURE } from "./project-root.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..", "..");
let pass = 0;
const check = (name, fn) => { fn(); console.log(`  PASS: ${name}`); pass++; };

console.log("== fixture-write-safety guard ==");

check("default project root (no FG_PROJECT_ROOT) is a throwaway COPY, never the committed fixture", () => {
  const saved = process.env.FG_PROJECT_ROOT;
  delete process.env.FG_PROJECT_ROOT;
  let root;
  try {
    root = defaultProjectRoot(false);
    const real = resolve(root);
    assert.ok(real !== resolve(COMMITTED_FIXTURE), "default must not BE the committed fixture");
    assert.ok(!real.startsWith(resolve(COMMITTED_FIXTURE) + "/"), "default must not be INSIDE the committed fixture");
    assert.ok(existsSync(join(root, ".foundergate", "project.json")), "the throwaway default must be a real copy of the fixture");
  } finally {
    if (root && root !== COMMITTED_FIXTURE) rmSync(root, { recursive: true, force: true });
    if (saved !== undefined) process.env.FG_PROJECT_ROOT = saved;
  }
});

check("an explicit FG_PROJECT_ROOT still overrides (tests / launcher)", () => {
  const saved = process.env.FG_PROJECT_ROOT;
  process.env.FG_PROJECT_ROOT = "/tmp/some-explicit-root";
  try { assert.equal(defaultProjectRoot(false), "/tmp/some-explicit-root"); }
  finally { if (saved !== undefined) process.env.FG_PROJECT_ROOT = saved; else delete process.env.FG_PROJECT_ROOT; }
});

check("every server uses the safe default and no longer defaults to the committed fixture", () => {
  const servers = [
    "src/v8a1/dashboard/server.mjs",
    "src/v8a2/server.mjs",
    "src/v8a3/filecabinet/server.mjs",
    "src/v8a4/guide/server.mjs",
  ];
  for (const rel of servers) {
    const s = readFileSync(join(REPO, rel), "utf8");
    assert.ok(/defaultProjectRoot/.test(s), `${rel} must use defaultProjectRoot`);
    // the old hole: a served root defaulting straight to the committed FIXTURE path.
    assert.ok(!/process\.env\.FG_PROJECT_ROOT\s*\|\|\s*FIXTURE/.test(s), `${rel} still defaults to the committed fixture (FG_PROJECT_ROOT || FIXTURE)`);
    assert.ok(!/=\s*PROJECT_ROOT\b/.test(s), `${rel} still uses a committed-fixture PROJECT_ROOT default`);
  }
});

console.log(`\nV8-FIXTURE-WRITE-SAFETY-GUARD: PASS ${pass}`);
