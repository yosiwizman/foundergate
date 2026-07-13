// SHWL §4.3 — fail-closed recovery (RECOVERY_REQUIRED -> NO_LEASE).
//
// Authority: docs/lanes/shared-host-workload-lease.md @ 6a4488d8ba728f203e83d0bf0d2ee48c684134af §4.3.
//
// When a reader derives RECOVERY_REQUIRED (stale heartbeat, expiry, boot mismatch, dead
// owner, malformed record, orphaned lock-dir), heavy work STAYS REFUSED. Unlock requires
// EXACTLY ONE of:
//   (a) MECHANICAL DEAD-PROOF — boot mismatch OR (same boot AND no live pid+start-marker);
//   (b) EXPLICIT FOUNDER-AUTHORIZED recovery — the §6 warning shown + explicit authorization.
// Every unlock writes an append-only event and records recovery.resolved_by. There is NO
// silent auto-unlock: expiry-alone and stale-heartbeat-alone NEVER unlock.

import {
  STATUS, RESOLVED_BY, RECOVERY_REASON, EVENT,
} from "./constants.mjs";
import {
  readLease, writeLease, appendEvent,
} from "./lease-store.mjs";
import { lockHeld, removeLock } from "./lock.mjs";
import { isProcessAlive as realIsAlive } from "./identity.mjs";
import { destroyCapability } from "./capability.mjs";

// (a) Mechanical dead-proof. Attempts to PROVE the owner is gone; if it cannot, it REFUSES
// (the slow-but-alive owner keeps the host). Returns { unlocked, proof|null, event_id|null, reason }.
export function mechanicalDeadProof(root, { currentBootId, now, isAlive = realIsAlive } = {}) {
  const lease = readLease(root);
  // A missing/malformed lease under a live lock is an orphan: recovery still needs proof.
  if (!lease.present || lease.malformed || !lease.parsed) {
    // No identity to prove death against. Cannot mechanically prove — REFUSE (fail-closed).
    return { unlocked: false, proof: null, event_id: null, reason: "NO_PROVABLE_OWNER_IDENTITY" };
  }
  const p = lease.parsed;

  let proof = null;
  if (p.owner_boot_id !== currentBootId) {
    proof = `boot mismatch: owner_boot_id=${p.owner_boot_id} current=${currentBootId} — owner from a prior boot cannot be running`;
  } else if (!isAlive(p.owner_pid, p.owner_process_start_marker)) {
    proof = `same boot, no live process matches owner_pid=${p.owner_pid} + start-marker — owner dead`;
  }

  if (!proof) {
    // Owner may still be alive (same boot, pid alive, marker matches) -> do NOT unlock.
    return { unlocked: false, proof: null, event_id: null, reason: "OWNER_MAY_BE_ALIVE" };
  }

  const reason = p.owner_boot_id !== currentBootId ? RECOVERY_REASON.BOOT_MISMATCH : RECOVERY_REASON.OWNER_DEAD;
  return finalizeRecovery(root, lease, {
    reason, resolved_by: RESOLVED_BY.MECHANICAL_DEAD_PROOF, proof, now,
  });
}

// (b) Explicit founder-authorized recovery. WITHOUT `authorized:true` this REFUSES (the §8
// checker item: founder recovery must be impossible without explicit authorization + event).
export function founderAuthorizedRecovery(root, { authorized, now, note } = {}) {
  if (authorized !== true) {
    return { unlocked: false, proof: null, event_id: null, reason: "NO_EXPLICIT_FOUNDER_AUTHORIZATION" };
  }
  const lease = readLease(root);
  const proof = `founder explicitly authorized force-recovery${note ? " — " + String(note).slice(0, 200) : ""}`;
  return finalizeRecovery(root, lease, {
    reason: (lease.parsed && lease.parsed.recovery && lease.parsed.recovery.reason) || RECOVERY_REASON.MALFORMED,
    resolved_by: RESOLVED_BY.FOUNDER_OVERRIDE, proof, now, allowMissingLease: true,
  });
}

// Shared finalize: append the recovery event, archive the lease as RELEASED with the
// recovery block, remove the lock-dir, drop capability custody -> effective NO_LEASE.
function finalizeRecovery(root, lease, { reason, resolved_by, proof, now, allowMissingLease = false }) {
  if ((!lease.present || !lease.parsed) && !allowMissingLease) {
    return { unlocked: false, proof: null, event_id: null, reason: "NO_LEASE_TO_RECOVER" };
  }
  const iso = new Date(now).toISOString();
  const p = lease.parsed;
  const event_id = appendEvent(root, {
    kind: EVENT.RECOVERY, at: iso, reason, resolved_by, proof,
    lease_id: p ? p.lease_id : null, owner_project: p ? p.owner_project : null, run_id: p ? p.run_id : null,
  });

  if (p) {
    const archived = {
      ...p,
      status: STATUS.RELEASED,
      released_at: iso,
      release_reason: `RECOVERED:${reason}:${resolved_by}`,
      recovery: { reason, resolved_by, proof: proof ? proof.slice(0, 512) : null, event_id },
    };
    try { writeLease(root, archived); } catch { /* best-effort archive; the event is the record of truth */ }
    try { destroyCapability(root, p.lease_id); } catch { /* access ends with the run */ }
  }

  if (lockHeld(root)) removeLock(root); // the orphan / dead-owner lock is cleared ONLY here
  return { unlocked: true, proof, event_id, reason };
}
