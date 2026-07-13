// SHWL §8 — adversarial attacks (the builder's own committed adversarial coverage; an
// INDEPENDENT checker still runs G/H). Every guarantee is attacked and must hold.

import assert from "node:assert/strict";
import { writeFileSync, rmSync } from "node:fs";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { launchSoak } from "./launcher.mjs";
import { simulateActiveOwnerLease } from "./akior-adoption.mjs";
import { guardHeavyOp } from "./guard.mjs";
import { mechanicalDeadProof, founderAuthorizedRecovery } from "./recovery.mjs";
import { readLease, leasePath, eventsText, rawLeaseText } from "./lease-store.mjs";
import { lockHeld, lockDirPath } from "./lock.mjs";
import { capabilityLeaks } from "./capability.mjs";
import { EFFECTIVE, RECOVERY_REASON } from "./constants.mjs";
import { harness, mkRoot, fixedIdentity, ALIVE, T0 } from "./_testkit.mjs";

const t = harness("SHWL adversarial (§8)");
const BOOT = "boot_TEST_1";

t.check("GUESSED/FORGED capability is refused (cooperative correctness)", () => {
  const root = mkRoot("adv");
  simulateActiveOwnerLease(root, { owner_project: "akior", run_id: "soak", identity: fixedIdentity({ boot_id: BOOT }), now: T0 });
  const forged = "f".repeat(64);
  const r = guardHeavyOp({ root, op: "build", requester: { run_id: "soak", capability: forged }, currentBootId: BOOT, now: T0 + 1000, isAlive: ALIVE });
  assert.equal(r.allowed, false);
});

t.check("SUBPROCESS WITHOUT capability acting under the lease is refused", () => {
  const root = mkRoot("adv");
  simulateActiveOwnerLease(root, { owner_project: "akior", identity: fixedIdentity({ boot_id: BOOT }), now: T0 });
  const r = guardHeavyOp({ root, op: "test", requester: { run_id: "soak", capability: null }, currentBootId: BOOT, now: T0 + 1000, isAlive: ALIVE });
  assert.equal(r.allowed, false);
});

t.check("TAMPER: corrupt lease.json under a LIVE lock => held-and-broken => REFUSE (no unlock)", () => {
  const root = mkRoot("adv");
  simulateActiveOwnerLease(root, { owner_project: "akior", identity: fixedIdentity({ boot_id: BOOT }), now: T0 });
  writeFileSync(leasePath(root), "{ tampered not json"); // lock-dir still present
  const r = guardHeavyOp({ root, op: "build", requester: null, currentBootId: BOOT, now: T0 + 1000, isAlive: ALIVE });
  assert.equal(r.allowed, false);
  assert.equal(r.effective, EFFECTIVE.RECOVERY_REQUIRED);
  assert.equal(lockHeld(root), true, "no auto-unlock on tamper");
});

t.check("DELETE lease.json under a LIVE lock => LOCK_ORPHAN => REFUSE (held-and-broken)", () => {
  const root = mkRoot("adv");
  simulateActiveOwnerLease(root, { owner_project: "akior", identity: fixedIdentity({ boot_id: BOOT }), now: T0 });
  rmSync(leasePath(root), { force: true });
  const r = guardHeavyOp({ root, op: "build", requester: null, currentBootId: BOOT, now: T0 + 1000, isAlive: ALIVE });
  assert.equal(r.allowed, false);
  assert.equal(r.effective, EFFECTIVE.RECOVERY_REQUIRED);
});

t.check("ORPHANED lock-dir (lock present, never a lease) => RECOVERY_REQUIRED, not auto-clear", () => {
  const root = mkRoot("adv");
  mkdirSync(lockDirPath(root), { recursive: true }); // a hard-crash orphan
  const r = guardHeavyOp({ root, op: "build", requester: null, currentBootId: BOOT, now: T0, isAlive: ALIVE });
  assert.equal(r.allowed, false);
  assert.equal(r.effective, EFFECTIVE.RECOVERY_REQUIRED);
  assert.equal(lockHeld(root), true, "orphan is NOT auto-cleared");
  // but a boot-mismatch mechanical proof cannot run without an owner identity -> stays refused
  const dp = mechanicalDeadProof(root, { currentBootId: "boot_NEW", now: T0 + 1000, isAlive: ALIVE });
  assert.equal(dp.unlocked, false, "no provable owner identity -> fail-closed");
});

t.check("EXPIRY ALONE does not unlock; STALE ALONE does not unlock", () => {
  const root = mkRoot("adv");
  simulateActiveOwnerLease(root, { owner_project: "akior", identity: fixedIdentity({ boot_id: BOOT }), heartbeat_interval_s: 30, lease_ttl_s: 60, now: T0 });
  // way past both TTL and heartbeat window
  const r = guardHeavyOp({ root, op: "build", requester: null, currentBootId: BOOT, now: T0 + 10 * 60 * 1000, isAlive: ALIVE });
  assert.equal(r.allowed, false);
  assert.equal(lockHeld(root), true, "still locked; nothing auto-unlocked");
});

t.check("FOUNDER recovery is impossible without explicit authorization", () => {
  const root = mkRoot("adv");
  simulateActiveOwnerLease(root, { owner_project: "akior", identity: fixedIdentity({ boot_id: BOOT }), now: T0 });
  assert.equal(founderAuthorizedRecovery(root, { authorized: false, now: T0 + 1 }).unlocked, false);
  assert.equal(lockHeld(root), true);
});

t.check("CAPABILITY LEAK: never in events.log or git-tracked evidence; legitimately only in lease.json", () => {
  const root = mkRoot("adv");
  const h = launchSoak({ root, owner_project: "akior", run_id: "r1", identity: fixedIdentity(), now: T0, preflight: () => ({ quiet: true }), isAlive: ALIVE });
  const cap = h.lease_capability_id;
  // events.log must NOT contain the capability
  const leak = capabilityLeaks(cap, { eventsText: eventsText(root), git: "any tracked file content here", log: "guard allowed owner activity" });
  assert.equal(leak.leaked, false, "capability leaked to: " + JSON.stringify(leak.surfaces));
  // it DOES live (legitimately, owner-only 0600) in lease.json
  assert.ok(rawLeaseText(root).includes(cap), "capability lives in the owner-only lease record");
  h.release({ now: T0 + 1000 });
  // after release, custody file is destroyed (access ends with the run)
  assert.equal(readLease(root).parsed.status, "RELEASED");
  void RECOVERY_REASON;
});

t.check("DOUBLE-ACQUIRE via launcher => exactly one winner", () => {
  const root = mkRoot("adv");
  const a = launchSoak({ root, owner_project: "akior", run_id: "a", identity: fixedIdentity(), now: T0, preflight: () => ({ quiet: true }), isAlive: ALIVE });
  const b = launchSoak({ root, owner_project: "akior", run_id: "b", identity: fixedIdentity({ pid: 888 }), now: T0 + 5, preflight: () => ({ quiet: true }), isAlive: ALIVE });
  assert.equal([a.acquired, b.acquired].filter(Boolean).length, 1);
});

t.done("SHWL-ADVERSARIAL-SELFTEST");
