// SHWL §2 — effective-decision derivation.
//
// Authority: docs/lanes/shared-host-workload-lease.md @ 6a4488d8ba728f203e83d0bf0d2ee48c684134af §2.
//
// A reader NEVER trusts lease.json.status alone. It derives an EFFECTIVE decision from
// { status, heartbeat freshness, expires_at, owner_boot_id vs current boot, owner liveness,
//   requester identity }. Expiry and stale heartbeat are ADVISORY signals that only RAISE
// RECOVERY_REQUIRED — they NEVER auto-unlock. The only transition that frees the host for a
// DIFFERENT workload is RECOVERY_REQUIRED -> NO_LEASE, and that requires §4.3.

import {
  STATUS, EFFECTIVE, DECISION, RECOVERY_REASON, STALE_MULTIPLIER,
} from "./constants.mjs";
import { authorizes } from "./capability.mjs";
import { isProcessAlive as realIsAlive } from "./identity.mjs";

// Is the heartbeat stale? Stale iff now is more than STALE_MULTIPLIER * interval past the
// last beat. A missing beat on an ACTIVE lease is stale. Clock skew only ever raises
// RECOVERY (refuse), never unlocks (§11.3 safe-side).
function heartbeatStale(lease, heartbeat, now, staleMultiplier) {
  const interval = lease.heartbeat_interval_s;
  const beatIso =
    (heartbeat && heartbeat.heartbeat_at) || lease.heartbeat_at || lease.activated_at || null;
  if (lease.status === STATUS.ACQUIRING && !beatIso) return false; // just acquired; beat imminent
  if (!beatIso) return true; // ACTIVE with no beat at all -> stale
  const beatMs = Date.parse(beatIso);
  if (!Number.isFinite(beatMs)) return true; // unparseable beat -> fail-closed stale
  return now - beatMs > interval * 1000 * staleMultiplier;
}

// The requester presenting a matching capability (exact owner OR declared subprocess).
function requesterOwns(lease, requester) {
  if (!requester) return false;
  return authorizes(lease, requester.capability);
}

// Derive the effective state + heavy-work decision for a reader.
//
// Inputs (all DATA — tests never shell out):
//   lockPresent   : boolean (lease.lockdir exists?)
//   lease         : result of lease-store.readLease -> { present, malformed, malformedReason, parsed }
//   heartbeat     : parsed heartbeat.json or null
//   currentBootId : this boot's id
//   requester     : { run_id, capability } | null (who wants to do heavy work)
//   now           : ms epoch (DATA)
//   isAlive       : (pid, marker) => boolean  (default: real mechanical liveness)
//
// Returns { effective, decision, recoveryReason|null, reason }.
export function deriveDecision({
  lockPresent, lease, heartbeat = null, currentBootId,
  requester = null, now, isAlive = realIsAlive, staleMultiplier = STALE_MULTIPLIER,
}) {
  const parsed = lease && lease.parsed;

  // 1) Host free: no lock AND (no lease or an explicitly RELEASED lease).
  if (!lockPresent && (!lease || !lease.present || (parsed && parsed.status === STATUS.RELEASED))) {
    return mk(EFFECTIVE.NO_LEASE, DECISION.MAY_ACQUIRE, null, "host is free — an atomic acquire may be attempted");
  }

  // 2) Lock present but lease.json missing OR malformed/corrupt/tampered -> held-and-broken.
  //    (Missing lease under a live lock = orphaned lock-dir; present-but-invalid = malformed.)
  if (lockPresent && (!lease || !lease.present)) {
    return mk(EFFECTIVE.RECOVERY_REQUIRED, DECISION.REFUSE, RECOVERY_REASON.LOCK_ORPHAN,
      "a lock-dir is present but there is no lease record — treated as held-and-broken");
  }
  if (lease && lease.present && lease.malformed) {
    return mk(EFFECTIVE.RECOVERY_REQUIRED, DECISION.REFUSE, RECOVERY_REASON.MALFORMED,
      "the lease record is missing identity fields / is corrupt — treated as held-and-broken: " + (lease.malformedReason || ""));
  }

  // From here the lease is present + schema-valid.
  // 3) A RELEASED lease (even if a lock lingers) is effectively NO_LEASE only if the lock is
  //    gone; a RELEASED status WITH a lingering lock is an orphan -> recovery.
  if (parsed.status === STATUS.RELEASED) {
    if (lockPresent) {
      return mk(EFFECTIVE.RECOVERY_REQUIRED, DECISION.REFUSE, RECOVERY_REASON.LOCK_ORPHAN,
        "lease is RELEASED but a lock-dir lingers — orphaned lock");
    }
    return mk(EFFECTIVE.NO_LEASE, DECISION.MAY_ACQUIRE, null, "prior lease released — host is free");
  }

  // 4) A lease already parked in RECOVERY_REQUIRED keeps refusing.
  if (parsed.status === STATUS.RECOVERY_REQUIRED) {
    return mk(EFFECTIVE.RECOVERY_REQUIRED, DECISION.REFUSE,
      (parsed.recovery && parsed.recovery.reason) || RECOVERY_REASON.MALFORMED,
      "lease is parked in RECOVERY_REQUIRED — heavy work stays paused until §4.3");
  }

  // 5) ACQUIRING or ACTIVE — derive liveness. Degradation checks in priority order; each
  //    only ever RAISES recovery (refuse), never unlocks.
  if (parsed.status === STATUS.ACQUIRING || parsed.status === STATUS.ACTIVE) {
    // (a) prior boot => owner cannot be running => strongest evidence, but still recovery.
    if (parsed.owner_boot_id !== currentBootId) {
      return mk(EFFECTIVE.RECOVERY_REQUIRED, DECISION.REFUSE, RECOVERY_REASON.BOOT_MISMATCH,
        "the owning run is from a PRIOR boot — recovery required (not silently trusted, not auto-unlocked)");
    }
    // (b) same boot but pid/start-marker not alive => owner dead (defeats PID reuse).
    if (!isAlive(parsed.owner_pid, parsed.owner_process_start_marker)) {
      return mk(EFFECTIVE.RECOVERY_REQUIRED, DECISION.REFUSE, RECOVERY_REASON.OWNER_DEAD,
        "the owning process is not alive (or a reused pid with a different start-marker) — recovery required");
    }
    // (c) past expires_at (advisory) => recovery, never unlock.
    if (parsed.expires_at && Number.isFinite(Date.parse(parsed.expires_at)) && now > Date.parse(parsed.expires_at)) {
      return mk(EFFECTIVE.RECOVERY_REQUIRED, DECISION.REFUSE, RECOVERY_REASON.EXPIRED,
        "the lease TTL has passed — advisory only: recovery required, NOT auto-unlocked");
    }
    // (d) stale heartbeat (advisory) => recovery, never unlock.
    if (heartbeatStale(parsed, heartbeat, now, staleMultiplier)) {
      return mk(EFFECTIVE.RECOVERY_REQUIRED, DECISION.REFUSE, RECOVERY_REASON.STALE_HEARTBEAT,
        "the owner's heartbeat is stale — recovery required, NOT auto-unlocked");
    }
    // Owner is alive, boot matches, TTL not passed, heartbeat fresh: it is genuinely held.
    if (requesterOwns(parsed, requester)) {
      return mk(EFFECTIVE.ACTIVE_OWNED, DECISION.ALLOW, null,
        "requester holds the exact owner or a declared-subprocess capability — declared soak activity only");
    }
    return mk(EFFECTIVE.ACTIVE_HELD, DECISION.REFUSE, null,
      "a qualifying run currently owns this host — heavy work is paused to protect its evidence");
  }

  // 6) Unknown / future status -> treat as held (§7.7: never absent).
  return mk(EFFECTIVE.RECOVERY_REQUIRED, DECISION.REFUSE, RECOVERY_REASON.MALFORMED,
    "unrecognized lease status — treated as held, never as absent");
}

function mk(effective, decision, recoveryReason, reason) {
  return { effective, decision, recoveryReason: recoveryReason || null, reason };
}
