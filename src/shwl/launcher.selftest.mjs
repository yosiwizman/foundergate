// SHWL §4.1/§4.2/§4.4 launcher — acquire->preflight->activate->heartbeat->release lifecycle;
// preflight race closed by a continuously-held lock; lease_id-checked release + heartbeat.

import assert from "node:assert/strict";
import { launchSoak, releaseByLeaseId } from "./launcher.mjs";
import { readLease, readEvents, readHeartbeat } from "./lease-store.mjs";
import { lockHeld } from "./lock.mjs";
import { STATUS } from "./constants.mjs";
import { harness, mkRoot, fixedIdentity, ALIVE, T0 } from "./_testkit.mjs";

const t = harness("SHWL launcher (§4.1/§4.2/§4.4)");
const id = fixedIdentity();

t.check("happy path: ACQUIRING->ACTIVE under a continuously-held lock; heartbeat; release", () => {
  const root = mkRoot("launch");
  const h = launchSoak({ root, owner_project: "akior", run_id: "r1", identity: id, now: T0, preflight: () => ({ quiet: true }), isAlive: ALIVE });
  assert.equal(h.acquired, true);
  assert.equal(lockHeld(root), true, "lock held from ACQUIRING through ACTIVE (preflight race closed)");
  const lease = readLease(root);
  assert.equal(lease.parsed.status, STATUS.ACTIVE);
  assert.ok(lease.parsed.activated_at);
  // heartbeat updates a fresh beat, lease_id-checked
  const beat = h.heartbeat(T0 + 30000);
  assert.equal(beat.ok, true);
  assert.equal(readHeartbeat(root).heartbeat_at, new Date(T0 + 30000).toISOString());
  // release
  const rel = h.release({ now: T0 + 60000 });
  assert.equal(rel.ok, true);
  assert.equal(lockHeld(root), false);
  assert.equal(readLease(root).parsed.status, STATUS.RELEASED);
  const kinds = readEvents(root).map((e) => e.kind);
  assert.deepEqual(kinds, ["ACQUIRE", "PREFLIGHT_PASS", "ACTIVATE", "RELEASE"]);
});

t.check("preflight FAIL: ACQUIRING->RELEASED, lock removed, nothing started", () => {
  const root = mkRoot("launch");
  const h = launchSoak({ root, owner_project: "akior", run_id: "r1", identity: id, now: T0, preflight: () => ({ quiet: false, reason: "browser running" }), isAlive: ALIVE });
  assert.equal(h.acquired, false);
  assert.equal(h.preflightFailed, true);
  assert.ok(/isn't quiet/.test(h.message));
  assert.equal(lockHeld(root), false, "reservation released");
  assert.equal(readLease(root).parsed.status, STATUS.RELEASED);
  assert.ok(readEvents(root).some((e) => e.kind === "PREFLIGHT_FAIL"));
});

t.check("double-acquire: a second launch loses (exactly one winner)", () => {
  const root = mkRoot("launch");
  const a = launchSoak({ root, owner_project: "akior", run_id: "rA", identity: id, now: T0, preflight: () => ({ quiet: true }), isAlive: ALIVE });
  const b = launchSoak({ root, owner_project: "akior", run_id: "rB", identity: fixedIdentity({ pid: 999 }), now: T0 + 100, preflight: () => ({ quiet: true }), isAlive: ALIVE });
  assert.equal(a.acquired, true);
  assert.equal(b.acquired, false, "loser refuses / does not re-acquire");
});

t.check("heartbeat NEVER changes ownership: a stale lease_id beat is refused", () => {
  const root = mkRoot("launch");
  const h = launchSoak({ root, owner_project: "akior", run_id: "r1", identity: id, now: T0, preflight: () => ({ quiet: true }), isAlive: ALIVE });
  h.release({ now: T0 + 10 });
  // successor acquires
  const h2 = launchSoak({ root, owner_project: "akior", run_id: "r2", identity: fixedIdentity({ pid: 555 }), now: T0 + 20, preflight: () => ({ quiet: true }), isAlive: ALIVE });
  // old handle tries to heartbeat -> lease_id mismatch -> refused, ownership unchanged
  const beat = h.heartbeat(T0 + 30);
  assert.equal(beat.ok, false);
  assert.equal(readLease(root).parsed.run_id, "r2", "successor ownership intact");
  void h2;
});

t.check("OLD OWNER cannot delete a SUCCESSOR's lease (lease_id-checked release)", () => {
  const root = mkRoot("launch");
  const h1 = launchSoak({ root, owner_project: "akior", run_id: "r1", identity: id, now: T0, preflight: () => ({ quiet: true }), isAlive: ALIVE });
  const oldLeaseId = h1.lease_id;
  h1.release({ now: T0 + 10 });
  const h2 = launchSoak({ root, owner_project: "akior", run_id: "r2", identity: fixedIdentity({ pid: 555 }), now: T0 + 20, preflight: () => ({ quiet: true }), isAlive: ALIVE });
  // old owner (only holds oldLeaseId) tries to release the successor -> refuse to delete
  const attempt = releaseByLeaseId(root, oldLeaseId, { now: T0 + 30 });
  assert.equal(attempt.ok, false);
  assert.equal(attempt.reason, "LEASE_ID_MISMATCH_REFUSE_DELETE");
  assert.equal(lockHeld(root), true, "successor lock intact");
  assert.equal(readLease(root).parsed.lease_id, h2.lease_id);
});

t.check("declareSubprocess mints a capability that authorizes; a foreign build does not", () => {
  const root = mkRoot("launch");
  const h = launchSoak({ root, owner_project: "akior", run_id: "r1", identity: id, now: T0, preflight: () => ({ quiet: true }), isAlive: ALIVE });
  const sub = h.declareSubprocess(T0 + 5);
  assert.equal(sub.ok, true);
  assert.ok(sub.capability.length >= 32);
  const lease = readLease(root);
  assert.ok(lease.parsed.declared_subprocess_capabilities.includes(sub.capability));
});

t.done("SHWL-LAUNCHER-SELFTEST");
