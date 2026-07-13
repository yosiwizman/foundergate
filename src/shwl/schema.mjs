// SHWL §3 — lease JSON schema + validation (zero-dependency, JSON-Schema-style).
//
// Authority: docs/lanes/shared-host-workload-lease.md @ 6a4488d8ba728f203e83d0bf0d2ee48c684134af §3.
//
// Timestamps are DATA (ISO-8601 strings) — never read implicitly from a clock inside a
// comparison. All identity fields are REQUIRED; a lease missing any is MALFORMED and MUST
// be treated as RECOVERY_REQUIRED, never as "no lease" (§2/§3).

import { SCHEMA_VERSION, STATUS } from "./constants.mjs";

const STATUS_VALUES = Object.freeze(Object.values(STATUS));

// The exact required set from §3 (identity + lifecycle knobs). Missing ANY -> MALFORMED.
export const REQUIRED_FIELDS = Object.freeze([
  "schema_version", "lease_id", "status",
  "owner_project", "owner_host_id", "owner_boot_id",
  "owner_pid", "owner_process_start_marker",
  "run_id", "lease_capability_id",
  "acquired_at", "heartbeat_interval_s", "lease_ttl_s",
]);

// Allowed property set (schema additionalProperties:false).
const ALLOWED_FIELDS = Object.freeze([
  ...REQUIRED_FIELDS,
  "declared_subprocess_capabilities",
  "activated_at", "heartbeat_at", "expires_at",
  "released_at", "release_reason", "recovery",
]);

const isStr = (v) => typeof v === "string";
const isInt = (v) => Number.isInteger(v);
const isIso = (v) => isStr(v) && Number.isFinite(Date.parse(v));
const len = (v, min, max) => isStr(v) && v.length >= min && v.length <= max;

// Returns { ok, errors: [string] }. `ok:false` => the lease is MALFORMED (RECOVERY_REQUIRED).
export function validateLease(obj) {
  const errors = [];
  if (obj == null || typeof obj !== "object" || Array.isArray(obj)) {
    return { ok: false, errors: ["lease is not a JSON object"] };
  }
  for (const f of REQUIRED_FIELDS) {
    if (!(f in obj)) errors.push(`missing required field: ${f}`);
  }
  for (const k of Object.keys(obj)) {
    if (!ALLOWED_FIELDS.includes(k)) errors.push(`unexpected field: ${k}`);
  }

  // schema_version: §7.7 — an unknown NEWER version is treated as held by the READER,
  // but at the record level we accept exactly the version we know; a foreign version is
  // reported so the reader can decide (state-machine treats it as RECOVERY, not absent).
  if ("schema_version" in obj && obj.schema_version !== SCHEMA_VERSION) {
    errors.push(`schema_version ${JSON.stringify(obj.schema_version)} != ${SCHEMA_VERSION}`);
  }
  if ("lease_id" in obj && !len(obj.lease_id, 8, 64)) errors.push("lease_id must be 8..64 chars");
  if ("status" in obj && !STATUS_VALUES.includes(obj.status)) errors.push(`status not one of ${STATUS_VALUES.join("/")}`);
  if ("owner_project" in obj && !len(obj.owner_project, 1, 64)) errors.push("owner_project must be 1..64 chars");
  if ("owner_host_id" in obj && !len(obj.owner_host_id, 1, 128)) errors.push("owner_host_id must be 1..128 chars");
  if ("owner_boot_id" in obj && !len(obj.owner_boot_id, 1, 128)) errors.push("owner_boot_id must be 1..128 chars");
  if ("owner_pid" in obj && !(isInt(obj.owner_pid) && obj.owner_pid >= 1)) errors.push("owner_pid must be integer >= 1");
  if ("owner_process_start_marker" in obj && !len(obj.owner_process_start_marker, 1, 128)) errors.push("owner_process_start_marker must be 1..128 chars");
  if ("run_id" in obj && !len(obj.run_id, 1, 128)) errors.push("run_id must be 1..128 chars");
  if ("lease_capability_id" in obj && !len(obj.lease_capability_id, 32, 128)) errors.push("lease_capability_id must be 32..128 chars (>=256 bits entropy)");
  if ("acquired_at" in obj && !isIso(obj.acquired_at)) errors.push("acquired_at must be ISO-8601 date-time");
  if ("heartbeat_interval_s" in obj && !(isInt(obj.heartbeat_interval_s) && obj.heartbeat_interval_s >= 1 && obj.heartbeat_interval_s <= 3600)) errors.push("heartbeat_interval_s must be integer 1..3600");
  if ("lease_ttl_s" in obj && !(isInt(obj.lease_ttl_s) && obj.lease_ttl_s >= 1)) errors.push("lease_ttl_s must be integer >= 1");

  // optional fields — validated only when present (null is allowed where the schema allows it)
  if ("declared_subprocess_capabilities" in obj) {
    const a = obj.declared_subprocess_capabilities;
    if (!Array.isArray(a) || a.length > 64 || !a.every((x) => len(x, 32, 128))) {
      errors.push("declared_subprocess_capabilities must be array (<=64) of 32..128-char strings");
    }
  }
  for (const f of ["activated_at", "heartbeat_at", "expires_at", "released_at"]) {
    if (f in obj && obj[f] != null && !isIso(obj[f])) errors.push(`${f} must be ISO-8601 date-time or null`);
  }
  if ("release_reason" in obj && obj.release_reason != null && !len(obj.release_reason, 0, 256)) errors.push("release_reason must be <=256 chars or null");
  if ("recovery" in obj && obj.recovery != null) {
    const r = obj.recovery;
    if (typeof r !== "object" || Array.isArray(r)) errors.push("recovery must be object or null");
    else {
      const reasons = ["STALE_HEARTBEAT", "EXPIRED", "BOOT_MISMATCH", "OWNER_DEAD", "MALFORMED", "LOCK_ORPHAN"];
      const by = ["MECHANICAL_DEAD_PROOF", "FOUNDER_OVERRIDE"];
      if ("reason" in r && !reasons.includes(r.reason)) errors.push("recovery.reason invalid");
      if ("resolved_by" in r && !by.includes(r.resolved_by)) errors.push("recovery.resolved_by invalid");
    }
  }

  return { ok: errors.length === 0, errors };
}

// A newly-minted ACQUIRING lease record (identity + capability supplied by caller).
export function newLeaseRecord({
  lease_id, owner_project, identity, run_id, lease_capability_id,
  acquired_at, heartbeat_interval_s, lease_ttl_s,
}) {
  const acquiredMs = Date.parse(acquired_at);
  const expires_at = new Date(acquiredMs + lease_ttl_s * 1000).toISOString();
  return {
    schema_version: SCHEMA_VERSION,
    lease_id,
    status: STATUS.ACQUIRING,
    owner_project,
    owner_host_id: identity.host_id,
    owner_boot_id: identity.boot_id,
    owner_pid: identity.pid,
    owner_process_start_marker: identity.process_start_marker,
    run_id,
    lease_capability_id,
    declared_subprocess_capabilities: [],
    acquired_at,
    activated_at: null,
    heartbeat_at: null,
    heartbeat_interval_s,
    lease_ttl_s,
    expires_at,
    released_at: null,
    release_reason: null,
    recovery: null,
  };
}
