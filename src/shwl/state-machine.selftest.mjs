// SHWL §2 state machine — effective-decision derivation from {status, heartbeat, expiry,
// boot, liveness, requester}. Advisory signals only RAISE recovery; never auto-unlock.

import assert from "node:assert/strict";
import { deriveDecision } from "./state-machine.mjs";
import { newLeaseRecord } from "./schema.mjs";
import { STATUS, EFFECTIVE, DECISION, RECOVERY_REASON } from "./constants.mjs";
import { harness, fixedIdentity, ALIVE, DEAD, T0 } from "./_testkit.mjs";

const t = harness("SHWL state machine (§2)");

const BOOT = "boot_TEST_1";
const CAP = "c".repeat(64);

function activeLease(over = {}) {
  const base = newLeaseRecord({
    lease_id: "lease_abcdef12", owner_project: "akior", identity: fixedIdentity({ boot_id: BOOT }),
    run_id: "r1", lease_capability_id: CAP,
    acquired_at: new Date(T0).toISOString(), heartbeat_interval_s: 30, lease_ttl_s: 3600,
  });
  return { present: true, malformed: false, malformedReason: null, parsed: { ...base, status: STATUS.ACTIVE, activated_at: new Date(T0).toISOString(), heartbeat_at: new Date(T0).toISOString(), ...over } };
}
const hb = (ms) => ({ heartbeat_at: new Date(ms).toISOString() });

t.check("no lock + no lease => NO_LEASE => MAY_ACQUIRE", () => {
  const d = deriveDecision({ lockPresent: false, lease: { present: false }, currentBootId: BOOT, now: T0, isAlive: ALIVE });
  assert.equal(d.effective, EFFECTIVE.NO_LEASE);
  assert.equal(d.decision, DECISION.MAY_ACQUIRE);
});

t.check("healthy ACTIVE, requester is NOT owner => ACTIVE_HELD => REFUSE", () => {
  const d = deriveDecision({ lockPresent: true, lease: activeLease(), heartbeat: hb(T0), currentBootId: BOOT, requester: { run_id: "other", capability: "x".repeat(64) }, now: T0 + 1000, isAlive: ALIVE });
  assert.equal(d.effective, EFFECTIVE.ACTIVE_HELD);
  assert.equal(d.decision, DECISION.REFUSE);
});

t.check("healthy ACTIVE, requester IS exact owner => ACTIVE_OWNED => ALLOW", () => {
  const d = deriveDecision({ lockPresent: true, lease: activeLease(), heartbeat: hb(T0), currentBootId: BOOT, requester: { run_id: "r1", capability: CAP }, now: T0 + 1000, isAlive: ALIVE });
  assert.equal(d.effective, EFFECTIVE.ACTIVE_OWNED);
  assert.equal(d.decision, DECISION.ALLOW);
});

t.check("declared subprocess capability => ACTIVE_OWNED => ALLOW", () => {
  const sub = "s".repeat(64);
  const lease = activeLease({ declared_subprocess_capabilities: [sub] });
  const d = deriveDecision({ lockPresent: true, lease, heartbeat: hb(T0), currentBootId: BOOT, requester: { run_id: "r1", capability: sub }, now: T0 + 1000, isAlive: ALIVE });
  assert.equal(d.effective, EFFECTIVE.ACTIVE_OWNED);
  assert.equal(d.decision, DECISION.ALLOW);
});

t.check("PRIOR BOOT => RECOVERY (BOOT_MISMATCH), never silent trust, never unlock", () => {
  const d = deriveDecision({ lockPresent: true, lease: activeLease(), heartbeat: hb(T0), currentBootId: "boot_DIFFERENT", requester: null, now: T0 + 1000, isAlive: ALIVE });
  assert.equal(d.effective, EFFECTIVE.RECOVERY_REQUIRED);
  assert.equal(d.recoveryReason, RECOVERY_REASON.BOOT_MISMATCH);
  assert.equal(d.decision, DECISION.REFUSE);
});

t.check("OWNER DEAD (pid/marker not alive) => RECOVERY (OWNER_DEAD)", () => {
  const d = deriveDecision({ lockPresent: true, lease: activeLease(), heartbeat: hb(T0), currentBootId: BOOT, requester: null, now: T0 + 1000, isAlive: DEAD });
  assert.equal(d.effective, EFFECTIVE.RECOVERY_REQUIRED);
  assert.equal(d.recoveryReason, RECOVERY_REASON.OWNER_DEAD);
});

t.check("EXPIRY ALONE => RECOVERY (EXPIRED), does NOT unlock", () => {
  const d = deriveDecision({ lockPresent: true, lease: activeLease(), heartbeat: hb(T0 + 3600 * 1000), currentBootId: BOOT, requester: null, now: T0 + 3600 * 1000 + 5000, isAlive: ALIVE });
  assert.equal(d.effective, EFFECTIVE.RECOVERY_REQUIRED);
  assert.equal(d.recoveryReason, RECOVERY_REASON.EXPIRED);
  assert.equal(d.decision, DECISION.REFUSE);
});

t.check("STALE HEARTBEAT ALONE => RECOVERY (STALE_HEARTBEAT), does NOT unlock", () => {
  // beat is old (>3*interval) but TTL not passed and owner 'alive'
  const d = deriveDecision({ lockPresent: true, lease: activeLease(), heartbeat: hb(T0), currentBootId: BOOT, requester: null, now: T0 + 200 * 1000, isAlive: ALIVE });
  assert.equal(d.effective, EFFECTIVE.RECOVERY_REQUIRED);
  assert.equal(d.recoveryReason, RECOVERY_REASON.STALE_HEARTBEAT);
});

t.check("lock present but lease MISSING => RECOVERY (LOCK_ORPHAN), held-and-broken", () => {
  const d = deriveDecision({ lockPresent: true, lease: { present: false }, currentBootId: BOOT, now: T0, isAlive: ALIVE });
  assert.equal(d.effective, EFFECTIVE.RECOVERY_REQUIRED);
  assert.equal(d.recoveryReason, RECOVERY_REASON.LOCK_ORPHAN);
});

t.check("lock present but lease MALFORMED => RECOVERY (MALFORMED), held-and-broken", () => {
  const d = deriveDecision({ lockPresent: true, lease: { present: true, malformed: true, malformedReason: "bad" }, currentBootId: BOOT, now: T0, isAlive: ALIVE });
  assert.equal(d.effective, EFFECTIVE.RECOVERY_REQUIRED);
  assert.equal(d.recoveryReason, RECOVERY_REASON.MALFORMED);
});

t.check("RELEASED + lingering lock => RECOVERY (LOCK_ORPHAN); RELEASED + no lock => NO_LEASE", () => {
  const rel = activeLease({ status: STATUS.RELEASED });
  assert.equal(deriveDecision({ lockPresent: true, lease: rel, currentBootId: BOOT, now: T0, isAlive: ALIVE }).recoveryReason, RECOVERY_REASON.LOCK_ORPHAN);
  assert.equal(deriveDecision({ lockPresent: false, lease: rel, currentBootId: BOOT, now: T0, isAlive: ALIVE }).effective, EFFECTIVE.NO_LEASE);
});

t.check("same-project DIFFERENT run (no matching capability) => ACTIVE_HELD => REFUSE", () => {
  const d = deriveDecision({ lockPresent: true, lease: activeLease(), heartbeat: hb(T0), currentBootId: BOOT, requester: { run_id: "r1", capability: "z".repeat(64) }, now: T0 + 1000, isAlive: ALIVE });
  assert.equal(d.effective, EFFECTIVE.ACTIVE_HELD);
  assert.equal(d.decision, DECISION.REFUSE);
});

t.done("SHWL-STATE-MACHINE-SELFTEST");
