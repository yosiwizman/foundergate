// SHWL — shared constants / enums.
//
// Authority: docs/lanes/shared-host-workload-lease.md @ 6a4488d8ba728f203e83d0bf0d2ee48c684134af
// (§2 state machine, §3 schema, §4 protocol). Pure Node, zero-dependency, ESM.
//
// One place for the vocabulary every SHWL module shares so a decision string can
// never drift between the guard, the state machine, and the evidence log.

// §3 schema_version — bumped compatibly; an unknown NEWER version is treated as
// held (RECOVERY_REQUIRED), never as absent (§7.7).
export const SCHEMA_VERSION = "1.0.0";

// §2 recorded lease.json.status (the owner's DECLARED state).
export const STATUS = Object.freeze({
  ACQUIRING: "ACQUIRING",
  ACTIVE: "ACTIVE",
  RECOVERY_REQUIRED: "RECOVERY_REQUIRED",
  RELEASED: "RELEASED",
});

// §2 EFFECTIVE state a reader DERIVES (never trusts status alone).
export const EFFECTIVE = Object.freeze({
  NO_LEASE: "NO_LEASE",
  ACTIVE_OWNED: "ACTIVE_OWNED", // exact owner or declared subprocess
  ACTIVE_HELD: "ACTIVE_HELD", // held by another run
  RECOVERY_REQUIRED: "RECOVERY_REQUIRED",
});

// The heavy-work decision a reader hands to a caller.
export const DECISION = Object.freeze({
  MAY_ACQUIRE: "MAY_ACQUIRE", // host free — an acquire may be attempted
  ALLOW: "ALLOW", // declared soak activity only
  REFUSE: "REFUSE", // held, or recovery required — heavy work paused
});

// §3 recovery.reason enum + §4.3 mechanical vs founder resolution.
export const RECOVERY_REASON = Object.freeze({
  STALE_HEARTBEAT: "STALE_HEARTBEAT",
  EXPIRED: "EXPIRED",
  BOOT_MISMATCH: "BOOT_MISMATCH",
  OWNER_DEAD: "OWNER_DEAD",
  MALFORMED: "MALFORMED",
  LOCK_ORPHAN: "LOCK_ORPHAN",
});

export const RESOLVED_BY = Object.freeze({
  MECHANICAL_DEAD_PROOF: "MECHANICAL_DEAD_PROOF",
  FOUNDER_OVERRIDE: "FOUNDER_OVERRIDE",
});

// Event kinds appended (append-only) to events.log (§4.4).
export const EVENT = Object.freeze({
  ACQUIRE: "ACQUIRE",
  PREFLIGHT_PASS: "PREFLIGHT_PASS",
  PREFLIGHT_FAIL: "PREFLIGHT_FAIL",
  ACTIVATE: "ACTIVATE",
  HEARTBEAT_GAP: "HEARTBEAT_GAP",
  RECOVERY: "RECOVERY",
  OVERRIDE: "OVERRIDE",
  RELEASE: "RELEASE",
  GUARD_REFUSE: "GUARD_REFUSE",
});

// Default lease-root path segments. The root itself is ALWAYS injectable
// (param or env) — see lease-store.resolveRoot. Tests MUST inject a temp dir.
export const DEFAULT_ROOT_SEGMENTS = [".cldh", "host-workload-lease"];
export const LOCKDIR = "lease.lockdir";
export const LEASE_FILE = "lease.json";
export const HEARTBEAT_FILE = "heartbeat.json";
export const EVENTS_FILE = "events.log";
export const CAPABILITY_DIR = "capability"; // owner-only (0700) custody dir (§4.5)
export const ATTESTATION_DIR = "attestation"; // per-run soak attestation (§5.1)

// How many missed heartbeat intervals before a beat is "stale" (advisory — only
// ever RAISES recovery, never unlocks; clock skew degrades to over-caution, §11.3).
export const STALE_MULTIPLIER = 3;
