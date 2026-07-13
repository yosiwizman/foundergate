// FREEZE MANIFEST — shared self-test helpers. NOT a self-test (no `.selftest.mjs` suffix),
// so the runner never executes it directly.
//
// HARD RULE: tests build throwaway trees under the OS temp dir ONLY. They never read or
// write any real repo path, home dir, or lease. mkRoot() returns a fresh temp dir and
// registers it for cleanup; guardTemp() refuses any root that is not under the OS temp area.

import { mkdtempSync, rmSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";

const roots = [];

export function guardTemp(root) {
  if (!root.startsWith(tmpdir())) {
    throw new Error(`REFUSED: a test root is not under the OS temp dir: ${root}`);
  }
  return root;
}

export function mkRoot(tag = "freeze") {
  const r = mkdtempSync(join(tmpdir(), `${tag}-`));
  roots.push(r);
  return guardTemp(r);
}

// Write a file (creating parent dirs) at a relative path inside a temp root.
export function put(root, rel, contents) {
  guardTemp(root);
  const abs = join(root, rel);
  mkdirSync(dirname(abs), { recursive: true });
  writeFileSync(abs, contents);
  return abs;
}

export function cleanup() {
  for (const r of roots.splice(0)) {
    try { if (existsSync(r)) rmSync(r, { recursive: true, force: true }); } catch { /* best-effort */ }
  }
}

// A valid-looking 40-hex git SHA for tests (DATA, never shelled out).
export const FAKE_SHA = "0123456789abcdef0123456789abcdef01234567";

// A fixed DATA timestamp (never a clock read).
export const T0 = "2026-07-13T12:00:00Z";

// Tiny PASS/among-checks harness matching the repo's existing self-test style.
export function harness(title) {
  let pass = 0;
  console.log(`== ${title} ==`);
  const check = (name, fn) => { fn(); pass++; console.log(`  PASS: ${name}`); };
  const done = (label) => {
    cleanup();
    console.log(`${label}: PASS (${pass} checks)`);
    return pass;
  };
  return { check, done, get pass() { return pass; } };
}
