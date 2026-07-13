// L4 — self-test helpers (NOT a *.selftest.mjs, so the runner never executes it directly).
//
// HARD RULE (authority §1 + build brief): tests MUST use throwaway OS-temp roots and NEVER read
// or write the real ~/.cldh. `mkRoot()` returns a fresh temp dir and guards against the real home
// lease; `seedActiveLease()` writes a schema-valid on-disk lease via the ACCEPTED src/shwl store.

import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir, homedir } from "node:os";
import { join } from "node:path";
import { newLeaseRecord } from "../shwl/schema.mjs";
import { writeLease, writeHeartbeat } from "../shwl/lease-store.mjs";
import { acquireLock } from "../shwl/lock.mjs";
import { STATUS } from "../shwl/constants.mjs";

const roots = [];

export function mkRoot(tag = "qhm") {
  const r = mkdtempSync(join(tmpdir(), `${tag}-`));
  const forbidden = join(homedir(), ".cldh");
  if (r === forbidden || r.startsWith(forbidden + "/") || r.startsWith(forbidden)) {
    throw new Error(`REFUSED: a test tried to use the real home lease dir: ${r}`);
  }
  if (!r.startsWith(tmpdir())) throw new Error(`REFUSED: a test root is not under the OS temp dir: ${r}`);
  roots.push(r);
  return r;
}

export function cleanup() {
  for (const r of roots.splice(0)) {
    try { if (existsSync(r)) rmSync(r, { recursive: true, force: true }); } catch { /* best-effort */ }
  }
}

export const T0 = Date.parse("2026-07-13T12:00:00Z");
// A schema-valid capability id (32..128 chars) — DATA, not a secret; only used in temp roots.
export const CAP = "capability_test_0123456789abcdefghij";

export function fixedIdentity(over = {}) {
  return {
    host_id: "host_QHMTEST",
    boot_id: "boot_QHM_1",
    pid: 525252,
    process_start_marker: "start_QHM_marker",
    ...over,
  };
}

// Write a schema-valid ACTIVE lease owned by `run_id` (optionally holding the lock-dir), plus a
// heartbeat. Uses the ACCEPTED src/shwl store — we IMPORT it, never reimplement it.
export function seedActiveLease(root, {
  run_id, owner_project = "otherproj", identity = fixedIdentity(),
  now = T0, holdLock = true, heartbeat_at,
} = {}) {
  if (holdLock) acquireLock(root);
  const acquired_at = new Date(now).toISOString();
  const lease_id = ("lease_" + run_id).slice(0, 64);
  const beat = heartbeat_at ?? acquired_at;
  let lease = newLeaseRecord({
    lease_id, owner_project, identity, run_id, lease_capability_id: CAP,
    acquired_at, heartbeat_interval_s: 30, lease_ttl_s: 3600,
  });
  lease = { ...lease, status: STATUS.ACTIVE, activated_at: acquired_at, heartbeat_at: beat };
  writeLease(root, lease);
  writeHeartbeat(root, { lease_id, heartbeat_at: beat });
  return lease;
}

// Tiny PASS/among-checks harness matching the repo's existing self-test style.
export function harness(title) {
  let pass = 0;
  console.log(`== ${title} ==`);
  const check = (name, fn) => { fn(); pass++; console.log(`  PASS: ${name}`); };
  const done = (label) => { cleanup(); console.log(`${label}: PASS (${pass} checks)`); return pass; };
  return { check, done, get pass() { return pass; } };
}
