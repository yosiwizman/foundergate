// SHWL §4.1/§4.2/§4.4 — soak launcher lifecycle (acquire -> preflight -> activate ->
// heartbeat -> release), lease_id-checked throughout.
//
// Authority: docs/lanes/shared-host-workload-lease.md @ 6a4488d8ba728f203e83d0bf0d2ee48c684134af §4.
//
// The lock-dir is held CONTINUOUSLY from ACQUIRING through preflight to ACTIVE, so no other
// heavy operation can slip in between the quiet-host check and launch (§4.2 preflight race).
// Heartbeats and status promotions only ever UPDATE within the held lock; they never
// re-acquire and never change lease_id / ownership. Release compares lease_id BEFORE removing
// the lock-dir, so an old/foreign process can never delete a successor's lease (§4.4).
//
// No REAL soak is executed here — the launcher orchestrates the lease lifecycle; the caller
// supplies the (injectable) preflight predicate and, in production, the actual soak process.

import { randomUUID } from "node:crypto";
import { STATUS, DECISION, EVENT } from "./constants.mjs";
import {
  resolveRoot, readLease, readHeartbeat, writeLease, writeHeartbeat, appendEvent,
} from "./lease-store.mjs";
import { acquireLock, lockHeld, removeLock } from "./lock.mjs";
import { deriveDecision } from "./state-machine.mjs";
import { newLeaseRecord } from "./schema.mjs";
import { captureIdentity, isProcessAlive as realIsAlive } from "./identity.mjs";
import {
  mintCapability, storeCapability, destroyCapability, registerSubprocess,
} from "./capability.mjs";
import { preflightRefusedMessage } from "./messages.mjs";

// Acquire the host lease in ACQUIRING, run the quiet-host preflight WHILE HOLDING THE LOCK,
// then promote to ACTIVE (or release on preflight fail). Returns a handle (see below) or a
// refusal object { acquired:false, ... } if the host is already held/recovery.
export function launchSoak({
  root: rootArg, owner_project, run_id = "run_" + randomUUID(),
  identity: identityOverrides = {}, now = Date.now(),
  heartbeat_interval_s = 30, lease_ttl_s = 6 * 60 * 60,
  preflight = () => ({ quiet: true }), isAlive = realIsAlive,
} = {}) {
  const root = resolveRoot(rootArg);
  const identity = captureIdentity(identityOverrides);
  const currentBootId = identity.boot_id;

  // §4.1 — the lock-dir IS the acquisition act. Exactly one concurrent attempt wins.
  const won = acquireLock(root);
  if (!won) {
    // Someone holds the lock. Read + derive to report why (held vs recovery) — never delete it.
    const lease = readLease(root);
    const d = deriveDecision({ lockPresent: true, lease, heartbeat: readHeartbeat(root), currentBootId, requester: null, now, isAlive });
    return { acquired: false, reason: d.reason, effective: d.effective, decision: d.decision };
  }

  // Winner mints identity + capability, writes ACQUIRING via atomic replace, starts heartbeat.
  const lease_id = "lease_" + randomUUID().replace(/-/g, "");
  const lease_capability_id = mintCapability();
  const acquired_at = new Date(now).toISOString();
  let lease = newLeaseRecord({
    lease_id, owner_project, identity, run_id, lease_capability_id,
    acquired_at, heartbeat_interval_s, lease_ttl_s,
  });
  writeLease(root, lease);
  storeCapability(root, lease_id, lease_capability_id); // owner-only custody (§4.5)
  appendEvent(root, { kind: EVENT.ACQUIRE, at: acquired_at, lease_id, owner_project, run_id });
  // §4.1 step 3 — heartbeat immediately, even in ACQUIRING.
  writeHeartbeat(root, { lease_id, heartbeat_at: acquired_at });
  lease = { ...lease, heartbeat_at: acquired_at };

  // §4.2 — quiet-host preflight WHILE HOLDING THE LOCK.
  const pf = preflight() || {};
  if (pf.quiet !== true) {
    // Preflight FAIL: ACQUIRING -> RELEASED (lease_id-checked), remove lock, archive.
    const iso = new Date(now).toISOString();
    const released = { ...lease, status: STATUS.RELEASED, released_at: iso, release_reason: "PREFLIGHT_NOT_QUIET" };
    writeLease(root, released);
    appendEvent(root, { kind: EVENT.PREFLIGHT_FAIL, at: iso, lease_id, run_id, detail: pf.reason || "host not quiet" });
    removeLock(root);
    destroyCapability(root, lease_id);
    return { acquired: false, preflightFailed: true, message: preflightRefusedMessage(), reason: pf.reason || "host not quiet" };
  }

  // Preflight PASS: promote the SAME lease ACQUIRING -> ACTIVE (set activated_at), atomic-replace.
  const activated_at = new Date(now).toISOString();
  lease = { ...lease, status: STATUS.ACTIVE, activated_at };
  writeLease(root, lease);
  appendEvent(root, { kind: EVENT.PREFLIGHT_PASS, at: activated_at, lease_id, run_id });
  appendEvent(root, { kind: EVENT.ACTIVATE, at: activated_at, lease_id, run_id });

  // Return the owner handle: heartbeat / declare-subprocess / release — all lease_id-checked.
  return makeHandle({ root, lease_id, run_id, lease, isAlive });
}

function makeHandle({ root, lease_id, run_id, lease: initialLease, isAlive }) {
  let leaseSnapshot = initialLease;
  return {
    acquired: true,
    root,
    lease_id,
    run_id,
    lease_capability_id: initialLease.lease_capability_id,
    get lease() { return leaseSnapshot; },

    // Heartbeat — lease_id-checked; NEVER changes ownership (§4.4). A beat whose lease_id no
    // longer matches the on-disk lease (a successor took over) is refused.
    heartbeat(now = Date.now()) {
      const cur = readLease(root);
      if (!cur.present || !cur.parsed || cur.parsed.lease_id !== lease_id) {
        return { ok: false, reason: "LEASE_ID_MISMATCH_HEARTBEAT_REFUSED" };
      }
      const iso = new Date(now).toISOString();
      writeHeartbeat(root, { lease_id, heartbeat_at: iso });
      return { ok: true, heartbeat_at: iso };
    },

    // Declare an authorized subprocess: mints a scoped declared capability, persists it on the
    // lease (lease_id-checked). Delivery to the child is via the broker fd (capability.mjs) —
    // never argv/env. Ordinary same-project builds never call this, so never inherit (§4.5).
    declareSubprocess(now = Date.now()) {
      const cur = readLease(root);
      if (!cur.present || !cur.parsed || cur.parsed.lease_id !== lease_id) {
        return { ok: false, reason: "LEASE_ID_MISMATCH" };
      }
      const { capability, lease: updated } = registerSubprocess(cur.parsed);
      writeLease(root, updated);
      leaseSnapshot = updated;
      appendEvent(root, { kind: "SUBPROCESS_DECLARED", at: new Date(now).toISOString(), lease_id, run_id });
      return { ok: true, capability };
    },

    // Release — lease_id-checked BEFORE removing the lock-dir / archiving (§4.4). An old or
    // foreign process whose lease_id doesn't match REFUSES to delete; it can never remove a
    // successor's lease.
    release({ now = Date.now(), reason = "SOAK_COMPLETE" } = {}) {
      const cur = readLease(root);
      if (!cur.present || !cur.parsed) return { ok: false, reason: "NO_LEASE" };
      if (cur.parsed.lease_id !== lease_id) {
        return { ok: false, reason: "LEASE_ID_MISMATCH_REFUSE_DELETE" };
      }
      const iso = new Date(now).toISOString();
      const released = { ...cur.parsed, status: STATUS.RELEASED, released_at: iso, release_reason: reason };
      writeLease(root, released);
      appendEvent(root, { kind: EVENT.RELEASE, at: iso, lease_id, run_id, reason });
      removeLock(root);
      destroyCapability(root, lease_id);
      return { ok: true, released_at: iso };
    },
  };
}

// A stand-alone lease_id-checked release for a process holding only a lease_id (proves an
// OLD owner cannot delete a SUCCESSOR's lease — §4.4 / §8 row 11).
export function releaseByLeaseId(root, lease_id, { now = Date.now(), reason = "RELEASE" } = {}) {
  const cur = readLease(root);
  if (!cur.present || !cur.parsed) return { ok: false, reason: "NO_LEASE" };
  if (cur.parsed.lease_id !== lease_id) return { ok: false, reason: "LEASE_ID_MISMATCH_REFUSE_DELETE" };
  const iso = new Date(now).toISOString();
  writeLease(root, { ...cur.parsed, status: STATUS.RELEASED, released_at: iso, release_reason: reason });
  appendEvent(root, { kind: EVENT.RELEASE, at: iso, lease_id, reason });
  if (lockHeld(root)) removeLock(root);
  destroyCapability(root, lease_id);
  return { ok: true };
}
