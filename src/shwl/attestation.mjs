// SHWL §5.1 — soak-run attestation + the QUIET_HOST override consequence (NORMATIVE).
//
// Authority: docs/lanes/shared-host-workload-lease.md @ 6a4488d8ba728f203e83d0bf0d2ee48c684134af §5.1.
//
// A manual override while an ACTIVE qualifying soak owns the host is NOT a neutral
// "proceed". It PERMANENTLY changes that run's standing:
//   - immediately + permanently removes QUIET_HOST eligibility;
//   - writes an append-only override event to events.log;
//   - enters the override INTERVAL into the run's attestation;
//   - the downgrade is preserved for the remainder of the run;
//   - QUIET_HOST is NEVER automatically restored.
//
// The eligibility flag cannot live on lease.json (schema is additionalProperties:false), so
// it lives in a per-run attestation file under the owner-only root. There is DELIBERATELY no
// restore/re-enable function in this module — quiet-host standing is never auto-restored.

import { mkdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { ATTESTATION_DIR, EVENT } from "./constants.mjs";
import { atomicWriteJSON, appendEvent, ensureRoot } from "./lease-store.mjs";

const attDir = (root) => join(root, ATTESTATION_DIR);
const attFile = (root, run_id) => join(attDir(root), `${encodeURIComponent(run_id)}.json`);

// Load (or default) a run's attestation. Default: eligible, never-downgraded.
export function loadAttestation(root, run_id) {
  const f = attFile(root, run_id);
  if (!existsSync(f)) {
    return {
      run_id,
      quiet_host_eligible: true,
      never_auto_restored: true, // invariant flag: once false, no code path re-enables it
      disqualified_at: null,
      disqualified_reason: null,
      override_intervals: [],
    };
  }
  try { return JSON.parse(readFileSync(f, "utf8")); } catch {
    // A corrupt attestation is fail-closed: treat as INELIGIBLE (never silently re-grant).
    return { run_id, quiet_host_eligible: false, never_auto_restored: true, disqualified_at: null, disqualified_reason: "CORRUPT_ATTESTATION", override_intervals: [] };
  }
}

function saveAttestation(root, att) {
  mkdirSync(attDir(root), { recursive: true, mode: 0o700 });
  atomicWriteJSON(attFile(root, att.run_id), att);
  return att;
}

export function isQuietHostEligible(root, run_id) {
  return loadAttestation(root, run_id).quiet_host_eligible === true;
}

// Apply the §5.1 consequence of a manual override during an ACTIVE qualifying soak.
// PERMANENT: sets quiet_host_eligible=false forever, records the interval, appends an event.
// Idempotent — a second override never re-grants eligibility and only records another interval.
export function applyOverrideConsequence(root, { run_id, now, reason = "MANUAL_OVERRIDE_DURING_ACTIVE_SOAK", interval } = {}) {
  ensureRoot(root);
  const att = loadAttestation(root, run_id);
  const iso = new Date(now).toISOString();
  att.quiet_host_eligible = false; // permanent, never auto-restored
  att.never_auto_restored = true;
  att.disqualified_at = att.disqualified_at || iso; // first disqualification instant is preserved
  att.disqualified_reason = att.disqualified_reason || reason;
  att.override_intervals = Array.isArray(att.override_intervals) ? att.override_intervals : [];
  att.override_intervals.push(interval || { from: iso, reason });
  saveAttestation(root, att);
  const event_id = appendEvent(root, {
    kind: EVENT.OVERRIDE, run_id, at: iso, reason,
    consequence: "QUIET_HOST_PERMANENTLY_DISQUALIFIED", never_auto_restored: true,
  });
  return { attestation: att, event_id };
}
