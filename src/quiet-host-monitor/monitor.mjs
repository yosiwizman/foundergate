// L4 — Quiet-host CONTINUOUS MONITOR (the DETECTION complement to the lease's PREVENTION).
//
// Authority: docs/lanes/shared-host-workload-lease.md @ 6a4488d8ba728f203e83d0bf0d2ee48c684134af
//   §8/§10  — the continuous host monitor is the (post-hoc) net that catches heavy work the
//             cooperative guard cannot prevent by construction (manual / non-harness commands).
//   §5.1    — a supposedly-quiet run that is caught NOT being quiet is PERMANENTLY downgraded:
//             QUIET_HOST eligibility is removed forever, the interval is entered into the run's
//             attestation, an append-only event is written, and it is NEVER auto-restored.
//
// SCOPE / SAFETY (honest):
//   - This monitor is PURE DETECTION over INJECTED DATA. Host observations (heavy-op sightings,
//     heartbeat/lease snapshots, liveness) arrive as DATA or observer callbacks. There is NO
//     real `ps` scraping and NO real process control in this module's pure path.
//   - It NEVER terminates, signals, or launches any process. It imports no OS process-control
//     module and exposes no process-control surface (asserted verbatim by the self-test).
//   - The ONLY consequence it applies is the ACCEPTED src/shwl §5.1 attestation downgrade, which
//     is permanent and NEVER auto-restored. This module imports src/shwl; it does not modify it.
//
// Timestamps are DATA: every `at` / `from` / `to` is an ISO-8601 string or ms-epoch number the
// caller supplies. Nothing here reads a wall clock inside a decision.

import {
  applyOverrideConsequence, isQuietHostEligible, loadAttestation,
} from "../shwl/attestation.mjs";
import { deriveDecision } from "../shwl/state-machine.mjs";
import { EFFECTIVE, RECOVERY_REASON } from "../shwl/constants.mjs";

// The closed set of quiet-host violations this monitor detects. Anything that proves a
// supposedly-quiet run was NOT quiet during its span maps to exactly one of these.
export const DETECTION = Object.freeze({
  PROHIBITED_WORKLOAD: "PROHIBITED_WORKLOAD", // a foreign heavy workload appeared after the run began
  MANUAL_BYPASS: "MANUAL_BYPASS",             // a manual / non-harness bypass of the guard
  LEASE_TAMPERED: "LEASE_TAMPERED",           // the lease record was tampered / seized by another run
  MISSING_HEARTBEAT: "MISSING_HEARTBEAT",     // the owner stopped heart-beating (stale / expired)
  OWNER_GONE: "OWNER_GONE",                   // the owning process disappeared (dead / prior boot)
});

const msOf = (t) => {
  if (typeof t === "number" && Number.isFinite(t)) return t;
  const ms = Date.parse(t);
  if (!Number.isFinite(ms)) throw new Error(`quiet-host-monitor: timestamp is not DATA: ${JSON.stringify(t)}`);
  return ms;
};
const isoOf = (t) => new Date(msOf(t)).toISOString();

// Map a derived RECOVERY_REQUIRED reason to the quiet-host violation it evidences.
function recoveryToDetection(reason) {
  switch (reason) {
    case RECOVERY_REASON.OWNER_DEAD:
    case RECOVERY_REASON.BOOT_MISMATCH:
      return DETECTION.OWNER_GONE;
    case RECOVERY_REASON.STALE_HEARTBEAT:
    case RECOVERY_REASON.EXPIRED:
      return DETECTION.MISSING_HEARTBEAT;
    case RECOVERY_REASON.MALFORMED:
    case RECOVERY_REASON.LOCK_ORPHAN:
    default:
      return DETECTION.LEASE_TAMPERED;
  }
}

// Create a continuous monitor bound to one run. The consequence applier and the host-state
// deriver are INJECTABLE (tests/prod supply DATA), defaulting to the ACCEPTED src/shwl modules.
export function createQuietHostMonitor({
  root,
  run_id,
  run_started_at = null,
  applyConsequence = applyOverrideConsequence, // REAL §5.1 downgrade by default
  deriveHostDecision = deriveDecision,          // REAL §2 state machine by default
} = {}) {
  if (!root) throw new Error("createQuietHostMonitor: root is required");
  if (typeof run_id !== "string" || run_id.length < 1) throw new Error("createQuietHostMonitor: run_id is required");
  const runStartMs = run_started_at == null ? null : msOf(run_started_at);

  const episodes = [];            // EXACT intervals of detected non-quiet, best-known bounds
  const openByKey = new Map();    // streaming key -> episode (to === null until cleared)
  let downgraded = false;         // this monitor has applied at least one §5.1 downgrade

  // Record the EXACT interval and PERMANENTLY downgrade the run via the ACCEPTED §5.1 attestation.
  // Never auto-restores; a repeat detection only records another interval (idempotent on eligibility).
  function detect({ kind, from, to = null, reason, detail = null }) {
    const fromMs = msOf(from);
    if (runStartMs != null && fromMs < runStartMs) {
      // A sighting strictly BEFORE the run began is not "during this run" — ignore it, do not
      // downgrade on pre-run noise.
      return { downgraded: false, ignored: true, kind, reason: "SIGHTING_BEFORE_RUN_START" };
    }
    const interval = {
      kind,
      from: isoOf(fromMs),
      to: to == null ? null : isoOf(to),
      reason: reason || kind,
      detail,
    };
    episodes.push(interval);
    const consequence = applyConsequence(root, {
      run_id,
      now: fromMs,
      reason: `QUIET_HOST_MONITOR:${kind}`,
      interval,
    });
    downgraded = true;
    return { downgraded: true, ignored: false, kind, interval, consequence };
  }

  return {
    root,
    run_id,

    // --- Prohibited workload (streaming appear/clear) ---------------------------------------
    // A foreign heavy workload SIGHTED after the run began. `foreign` defaults true; a workload
    // the caller can prove is the owner's declared subprocess is NOT a violation (foreign:false).
    prohibitedWorkloadAppeared({ at, op = null, detail = null, foreign = true } = {}) {
      if (!foreign) return { downgraded: false, ignored: true, reason: "OWNED_SUBPROCESS_NOT_A_VIOLATION" };
      const key = `${DETECTION.PROHIBITED_WORKLOAD}:${op || ""}`;
      const r = detect({ kind: DETECTION.PROHIBITED_WORKLOAD, from: at, reason: op ? `foreign op '${op}'` : "foreign heavy workload", detail: detail ?? op });
      if (r.downgraded) openByKey.set(key, r.interval); // hold the open interval to close its `to` later
      return r;
    },
    // Close the matching open interval with its EXACT end. The permanent downgrade already fired
    // at APPEAR (detection is immediate); this only sharpens the recorded interval bound.
    prohibitedWorkloadCleared({ at, op = null } = {}) {
      const key = `${DETECTION.PROHIBITED_WORKLOAD}:${op || ""}`;
      const open = openByKey.get(key);
      if (open) { open.to = isoOf(at); openByKey.delete(key); return { closed: true, interval: open }; }
      return { closed: false };
    },

    // --- Instantaneous violations -----------------------------------------------------------
    manualBypassDetected({ at, detail = null } = {}) {
      return detect({ kind: DETECTION.MANUAL_BYPASS, from: at, to: at, reason: "manual / non-harness heavy work", detail });
    },
    leaseTamperDetected({ at, detail = null } = {}) {
      return detect({ kind: DETECTION.LEASE_TAMPERED, from: at, to: at, reason: "lease record tampered / seized", detail });
    },
    heartbeatMissing({ at, detail = null } = {}) {
      return detect({ kind: DETECTION.MISSING_HEARTBEAT, from: at, to: at, reason: "owner heartbeat stopped", detail });
    },
    ownerGone({ at, detail = null } = {}) {
      return detect({ kind: DETECTION.OWNER_GONE, from: at, to: at, reason: "owning process disappeared", detail });
    },

    // --- Derived host-state observation ------------------------------------------------------
    // Feed a host-state SNAPSHOT (all DATA: lease/heartbeat records, currentBootId, injected
    // liveness). The ACCEPTED §2 state machine derives the effective state; a RECOVERY_REQUIRED
    // derivation (owner dead/prior-boot/stale/expired/tampered) or a foreign ACTIVE_HELD owner
    // is a quiet-host violation and downgrades this run. A cleanly-owned/free host is quiet.
    observeHostState({ at, lease, heartbeat = null, currentBootId, isAlive, requester = null, lockPresent } = {}) {
      const d = deriveHostDecision({
        lockPresent: lockPresent ?? true,
        lease, heartbeat, currentBootId, requester,
        now: msOf(at), isAlive,
      });
      // Cleanly owned by us, or a genuinely free host, is QUIET — no downgrade.
      if (d.effective === EFFECTIVE.ACTIVE_OWNED || d.effective === EFFECTIVE.NO_LEASE) {
        return { quiet: true, effective: d.effective, detection: null };
      }
      // Another run now owns the host during OUR supposedly-quiet run: the lease was seized.
      if (d.effective === EFFECTIVE.ACTIVE_HELD) {
        const r = detect({ kind: DETECTION.LEASE_TAMPERED, from: at, to: at, reason: "host owned by a DIFFERENT run mid-soak", detail: d.reason });
        return { quiet: false, effective: d.effective, detection: r.interval, result: r };
      }
      // RECOVERY_REQUIRED — map the mechanical reason to the violation it evidences.
      const kind = recoveryToDetection(d.recoveryReason);
      const r = detect({ kind, from: at, to: at, reason: d.recoveryReason || "recovery required", detail: d.reason });
      return { quiet: false, effective: d.effective, detection: r.interval, result: r };
    },

    // --- Read-back (proves the downgrade is authoritative & permanent) ------------------------
    // Reads eligibility from the REAL attestation authority (events.log wins over the file).
    eligibleNow() { return isQuietHostEligible(root, run_id); },
    attestationNow() { return loadAttestation(root, run_id); },

    // A pure snapshot of what this monitor has observed (no I/O).
    snapshot() {
      return {
        run_id,
        run_started_at: runStartMs == null ? null : new Date(runStartMs).toISOString(),
        quiet_host_downgraded: downgraded,
        episodes: episodes.map((e) => ({ ...e })),
      };
    },
  };
}
