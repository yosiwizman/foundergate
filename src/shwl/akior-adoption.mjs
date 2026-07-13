// SHWL §9 C/D — AKIOR adoption adapter + SIMULATION harness (NO AKIOR code is touched).
//
// Authority: docs/lanes/shared-host-workload-lease.md @ 6a4488d8ba728f203e83d0bf0d2ee48c684134af §9 C/D, §7.
//
// AKIOR is READ-ONLY / radioactive-adjacent in this wave: we do NOT run AKIOR, and we do NOT
// write anything under any AKIOR path. §9 C/D ("AKIOR integration") is realized WITHOUT
// touching AKIOR by:
//   1) using the SAME shared library (one guard, one lease) — the exact adapter AKIOR would
//      import, expressed here against owner_project="akior";
//   2) a SIMULATION that stands in an AKIOR-labelled owner via lease RECORDS (owner_project +
//      capability), NOT a real AKIOR process. The §8.1 matrix rows "AKIOR soak active -> ..."
//      are simulated with these lease records.
//
// This file is the cross-project adoption CONTRACT expressed as code: an AKIOR soak launcher
// wrapper and AKIOR heavy entry points, both routed through the SAME shared guard/lease as
// FounderGate. Simulation helpers let tests place an AKIOR-labelled ACTIVE lease on disk.

import { launchSoak } from "./launcher.mjs";
import { guardHeavyOp } from "./guard.mjs";
import { bootId } from "./identity.mjs";
import { newLeaseRecord } from "./schema.mjs";
import { STATUS } from "./constants.mjs";
import { mintCapability, storeCapability } from "./capability.mjs";
import {
  ensureRoot, writeLease, writeHeartbeat, appendEvent,
} from "./lease-store.mjs";
import { acquireLock } from "./lock.mjs";

export const AKIOR_PROJECT = "akior";

// The adapter AKIOR WOULD import (routed through the one shared library, §7.3). Presented
// here for parity with FounderGate; not exercised against a real AKIOR process in this wave.
export function akiorLaunchSoak(opts = {}) {
  return launchSoak({ ...opts, owner_project: AKIOR_PROJECT });
}

export function akiorGuard({ root, op, requester = null, currentBootId, now = Date.now(), override = null, expectedFinish = null } = {}) {
  return guardHeavyOp({ root, op, requester, currentBootId: currentBootId || bootId(), now, override, expectedFinish });
}

// ---- SIMULATION (test harness only) ---------------------------------------------------
//
// Place an ACTIVE, healthy, AKIOR-labelled owner lease on disk WITHOUT running AKIOR. Returns
// { lease_id, run_id, capability, identity } so a test can act as the owner or as an intruder.
// This is how "AKIOR soak active" rows in §8.1 are staged — lease records, not processes.
export function simulateActiveOwnerLease(root, {
  owner_project = AKIOR_PROJECT, run_id = "akior_run_sim", now = Date.now(),
  identity, heartbeat_interval_s = 30, lease_ttl_s = 6 * 60 * 60,
  declared_subprocess_capabilities = [],
} = {}) {
  ensureRoot(root);
  acquireLock(root); // take the exclusivity primitive so the state machine reads it as held
  const lease_id = "lease_sim_" + owner_project + "_" + Math.floor(now).toString(36);
  const capability = mintCapability();
  const acquired_at = new Date(now).toISOString();
  const base = newLeaseRecord({
    lease_id, owner_project, identity, run_id, lease_capability_id: capability,
    acquired_at, heartbeat_interval_s, lease_ttl_s,
  });
  const active = {
    ...base,
    status: STATUS.ACTIVE,
    activated_at: acquired_at,
    heartbeat_at: acquired_at,
    declared_subprocess_capabilities,
  };
  writeLease(root, active);
  storeCapability(root, lease_id, capability);
  writeHeartbeat(root, { lease_id, heartbeat_at: acquired_at });
  appendEvent(root, { kind: "SIM_ACTIVE_OWNER", at: acquired_at, lease_id, owner_project, run_id });
  return { lease_id, run_id, capability, identity, lease: active };
}
