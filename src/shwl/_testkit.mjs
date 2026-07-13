// SHWL — shared self-test helpers. NOT a self-test itself (no `.selftest.mjs` suffix), so
// the runner does not execute it directly.
//
// HARD RULE (authority §1 + build brief): tests MUST use throwaway temp dirs and NEVER read
// or write the real ~/.cldh. `mkRoot()` returns a fresh temp dir under the OS temp area and
// registers it for cleanup; `guardHome()` asserts no test ever points at the real home lease.

import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir, homedir } from "node:os";
import { join } from "node:path";

const roots = [];

export function mkRoot(tag = "shwl") {
  const r = mkdtempSync(join(tmpdir(), `${tag}-`));
  roots.push(r);
  guardHome(r);
  return r;
}

// Fail LOUDLY if a root ever resolves inside the real home lease dir.
export function guardHome(root) {
  const forbidden = join(homedir(), ".cldh");
  if (root === forbidden || root.startsWith(forbidden + "/") || root.startsWith(forbidden)) {
    throw new Error(`REFUSED: a test tried to use the real home lease dir: ${root}`);
  }
  if (!root.startsWith(tmpdir())) {
    throw new Error(`REFUSED: a test root is not under the OS temp dir: ${root}`);
  }
  return root;
}

export function cleanup() {
  for (const r of roots.splice(0)) {
    try { if (existsSync(r)) rmSync(r, { recursive: true, force: true }); } catch { /* best-effort */ }
  }
}

// A fixed, deterministic identity (DATA — no shelling out). Overridable per field.
export function fixedIdentity(over = {}) {
  return {
    host_id: "host_TESTHW",
    boot_id: "boot_TEST_1",
    pid: 424242,
    process_start_marker: "start_TEST_marker",
    ...over,
  };
}

// A fixed clock anchor for deterministic timestamps.
export const T0 = Date.parse("2026-07-13T12:00:00Z");

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

// Always-alive / always-dead injectable liveness for deterministic derivation tests.
export const ALIVE = () => true;
export const DEAD = () => false;
