// L2 RUN ATTESTATION — the append-only, hash-chained record of a run.
//
// Authority (full SHAs; §28 written-authority):
//   - docs/lanes/shared-host-workload-lease.md @ 6a4488d8ba728f203e83d0bf0d2ee48c684134af
//   - docs/ASSEMBLY_MANUAL.md @ a2c4a10adc88d7de760cd8f4f0c0595458f5c6c6  §26 (append-only + exact-SHA
//     provenance), §29 (honest-duration / soak-proof), Law 54 (never report the unverifiable as intact).
//
// WHAT THIS IS: the structured, tamper-evident record FROM WHICH a future §29 soak PASS is built. It is
// NOT a soak pass and MUST NEVER emit a FOUNDERGATE HARNESS N-HOUR SOAK-PASS banner line — it only records
// the INGREDIENTS (span, monitoring refs, failures log) so a separate, guarded process can later judge.
//
// WHAT THIS IS NOT: it does not import lane L1/L3/L4. freeze_manifest_hash and lease_id are accepted as
// opaque DATA. There is no wall-clock read anywhere — every timestamp is DATA the caller passes in.
//
// These are PURE RECORD functions (evidence writing/reading), so per the SHWL build brief they need no
// lease guard. There is no HEAVY entry point in this module; if one were ever added it MUST first call
// src/shwl guardHeavyOp(...) and refuse when the host lease is not owned.

import { GENESIS_HASH, hashEntry } from "./canonical.mjs";
import { appendEntryLine, loadEntries } from "./store.mjs";

const SCHEMA_VERSION = 1;

export const ENTRY_TYPE = Object.freeze({
  RUN_OPEN: "RUN_OPEN",
  EVENT: "EVENT",
  MONITORING_WINDOW: "MONITORING_WINDOW",
  FAILURE: "FAILURE",
  FAILURE_RESOLVED: "FAILURE_RESOLVED",
  RUN_SEAL: "RUN_SEAL",
});

// Fields a run record MUST reference. L1/L3/L4 outputs enter here as opaque DATA (strings), never imports.
const REQUIRED_RUN_FIELDS = [
  "run_id", "host_id", "boot_id",
  "freeze_manifest_hash", // DATA — do NOT import lane L1
  "lease_id",             // DATA — accept the SHWL lease id, do not re-derive it
  "start_at",
];

// ---------------------------------------------------------------------------------------------------
// timestamp handling — timestamps are DATA. We normalize only to compare spans; we never generate one.
// Accepts an epoch-millisecond number or an ISO-8601 string. Anything else throws (fail-closed).
// ---------------------------------------------------------------------------------------------------
export function toEpochMs(t) {
  if (typeof t === "number" && Number.isFinite(t)) return t;
  if (typeof t === "string") {
    const ms = Date.parse(t); // pure parse of provided DATA; NOT a clock read
    if (Number.isFinite(ms)) return ms;
  }
  throw new TypeError(`invalid timestamp DATA: ${JSON.stringify(t)}`);
}

// ---------------------------------------------------------------------------------------------------
// building the chain
// ---------------------------------------------------------------------------------------------------
function seal(entry) {
  entry.entry_hash = hashEntry(entry);
  return entry;
}

function makeEntry({ seq, type, at, payload, previous_hash }) {
  const entry = {
    v: SCHEMA_VERSION,
    seq,
    id: `entry-${seq}`,
    type,
    at,
    payload,
    previous_hash,
  };
  return seal(entry);
}

function lastEntry(log) {
  return log.entries[log.entries.length - 1];
}

function persist(log, entry) {
  log.entries.push(entry);
  if (log.dir) appendEntryLine(log.dir, entry);
  return log;
}

// openRun — start a new attestation chain with the RUN_OPEN genesis entry.
//   { dir?, run: {run_id, host_id, boot_id, freeze_manifest_hash, lease_id, start_at,
//                 monitoring_window_refs?, failures_log_ref?, end_at?}, at }
// `at` is the DATA timestamp for the act of opening; `run.start_at` is the run's real start (DATA).
// Returns a log handle { dir, entries, sealed:false }.
export function openRun({ dir = null, run, at }) {
  if (!run || typeof run !== "object") throw new TypeError("openRun: run record required");
  for (const f of REQUIRED_RUN_FIELDS) {
    if (run[f] === undefined || run[f] === null || run[f] === "") {
      throw new TypeError(`openRun: run.${f} is required`);
    }
  }
  toEpochMs(run.start_at); // validate DATA up front (throws if unparseable)
  if (at === undefined) throw new TypeError("openRun: at (timestamp DATA) required");

  const payload = {
    run_id: String(run.run_id),
    host_id: String(run.host_id),
    boot_id: String(run.boot_id),
    freeze_manifest_hash: String(run.freeze_manifest_hash),
    lease_id: String(run.lease_id),
    start_at: run.start_at,
    monitoring_window_refs: Array.isArray(run.monitoring_window_refs) ? run.monitoring_window_refs : [],
    failures_log_ref: run.failures_log_ref ?? null,
  };

  const genesis = makeEntry({ seq: 0, type: ENTRY_TYPE.RUN_OPEN, at, payload, previous_hash: GENESIS_HASH });
  const log = { dir, entries: [], sealed: false };
  return persist(log, genesis);
}

// appendEvent — link a new entry onto the chain via previous_hash = last.entry_hash.
//   appendEvent(log, { type?, at, payload? })
// Refuses once the run is sealed (an append-only sealed record must not grow).
export function appendEvent(log, { type = ENTRY_TYPE.EVENT, at, payload = {} }) {
  assertLog(log);
  if (log.sealed) throw new Error("appendEvent: run is sealed; the chain is closed");
  if (type === ENTRY_TYPE.RUN_OPEN) throw new Error("appendEvent: RUN_OPEN is only valid as the genesis entry");
  if (at === undefined) throw new TypeError("appendEvent: at (timestamp DATA) required");
  const prev = lastEntry(log);
  const entry = makeEntry({ seq: prev.seq + 1, type, at, payload, previous_hash: prev.entry_hash });
  return persist(log, entry);
}

// Convenience recorders (thin wrappers; all record DATA only).
export function recordMonitoringWindow(log, { at, ref }) {
  return appendEvent(log, { type: ENTRY_TYPE.MONITORING_WINDOW, at, payload: { ref } });
}
export function recordFailure(log, { at, failure_id, detail = null }) {
  if (!failure_id) throw new TypeError("recordFailure: failure_id required");
  return appendEvent(log, { type: ENTRY_TYPE.FAILURE, at, payload: { failure_id, detail } });
}
export function resolveFailure(log, { at, failure_id, resolution = null }) {
  if (!failure_id) throw new TypeError("resolveFailure: failure_id required");
  return appendEvent(log, { type: ENTRY_TYPE.FAILURE_RESOLVED, at, payload: { failure_id, resolution } });
}

// sealRun — append the terminal RUN_SEAL entry recording end_at (DATA), then close the chain.
export function sealRun(log, { end_at, at }) {
  assertLog(log);
  if (log.sealed) throw new Error("sealRun: already sealed");
  toEpochMs(end_at); // validate DATA
  if (at === undefined) throw new TypeError("sealRun: at (timestamp DATA) required");
  const prev = lastEntry(log);
  const entry = makeEntry({
    seq: prev.seq + 1, type: ENTRY_TYPE.RUN_SEAL, at,
    payload: { end_at }, previous_hash: prev.entry_hash,
  });
  persist(log, entry);
  log.sealed = true;
  return log;
}

// ---------------------------------------------------------------------------------------------------
// verification — Law 54: an unverifiable chain is NEVER reported intact.
// Returns "intact" or "broken-at-<id>". Accepts a log handle, a raw entries array, or a dir path (loads).
// ---------------------------------------------------------------------------------------------------
export function verifyAttestation(logOrEntriesOrDir) {
  const entries = normalizeEntries(logOrEntriesOrDir);
  if (!Array.isArray(entries) || entries.length === 0) return "broken-at-empty";

  let prev = GENESIS_HASH;
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const idFor = idAt(entries, i);

    // structural sanity — any of these means the record cannot be trusted (fail-closed).
    if (!e || typeof e !== "object") return `broken-at-${idFor}`;
    if (e.seq !== i) return `broken-at-${idFor}`;                       // deletion/reorder shifts positions
    if (i === 0 && e.type !== ENTRY_TYPE.RUN_OPEN) return `broken-at-${idFor}`;
    if (i > 0 && e.type === ENTRY_TYPE.RUN_OPEN) return `broken-at-${idFor}`;
    if (e.previous_hash !== prev) return `broken-at-${idFor}`;          // linkage break
    if (typeof e.entry_hash !== "string") return `broken-at-${idFor}`;
    if (hashEntry(e) !== e.entry_hash) return `broken-at-${idFor}`;     // byte-level edit

    prev = e.entry_hash;
  }
  return "intact";
}

function idAt(entries, i) {
  const e = entries[i];
  if (e && typeof e.id === "string") return e.id;
  return `entry-${i}`;
}

// ---------------------------------------------------------------------------------------------------
// honest soak-ELIGIBILITY — records INGREDIENTS; NEVER a soak PASS (report-provenance forbids a bare
// SOAK PASS line). §29: eligible ONLY if end_at-start_at >= claimSeconds AND no unresolved failures.
// Unverifiable => UNKNOWN, never eligible (Law 54).
// ---------------------------------------------------------------------------------------------------
export function isSoakEligible(logOrEntriesOrDir, { claimSeconds } = {}) {
  if (!(typeof claimSeconds === "number" && Number.isFinite(claimSeconds) && claimSeconds >= 0)) {
    throw new TypeError("isSoakEligible: { claimSeconds } must be a finite, non-negative number of seconds");
  }
  const entries = normalizeEntries(logOrEntriesOrDir);
  const verdict = verifyAttestation(entries);
  if (verdict !== "intact") {
    // Cannot trust the record → we do not know the true span/failures → UNKNOWN, never eligible.
    return { eligible: false, status: "UNKNOWN", reason: `chain not verifiable (${verdict})`, verdict };
  }

  const open = entries[0];
  const sealEntry = entries.find((e) => e.type === ENTRY_TYPE.RUN_SEAL);
  if (!sealEntry) {
    return { eligible: false, status: "NOT_ELIGIBLE", reason: "run is not sealed (no end_at recorded)", verdict };
  }

  const startMs = toEpochMs(open.payload.start_at);
  const endMs = toEpochMs(sealEntry.payload.end_at);
  const spanSeconds = (endMs - startMs) / 1000;

  const unresolved = unresolvedFailures(entries);

  const spanOk = spanSeconds >= claimSeconds;
  const failuresOk = unresolved.length === 0;
  const eligible = spanOk && failuresOk;

  const reasons = [];
  if (!spanOk) reasons.push(`span ${spanSeconds}s < claimed ${claimSeconds}s`);
  if (!failuresOk) reasons.push(`unresolved failures: ${unresolved.join(", ")}`);

  return {
    eligible,
    status: eligible ? "ELIGIBLE" : "NOT_ELIGIBLE",
    reason: eligible ? "span meets claim and no unresolved failures" : reasons.join("; "),
    spanSeconds,
    claimSeconds,
    unresolvedFailures: unresolved,
    verdict,
    // NOTE: deliberately NO "soak_pass" / PASS-line field. This is eligibility of ingredients only.
  };
}

// Unresolved = FAILURE failure_ids with no later FAILURE_RESOLVED for the same id.
export function unresolvedFailures(entries) {
  const opened = new Set();
  const resolved = new Set();
  for (const e of entries) {
    if (e.type === ENTRY_TYPE.FAILURE) opened.add(e.payload.failure_id);
    else if (e.type === ENTRY_TYPE.FAILURE_RESOLVED) resolved.add(e.payload.failure_id);
  }
  return [...opened].filter((id) => !resolved.has(id));
}

// ---------------------------------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------------------------------
function assertLog(log) {
  if (!log || !Array.isArray(log.entries) || log.entries.length === 0) {
    throw new TypeError("expected a log handle from openRun()");
  }
}

function normalizeEntries(x) {
  if (typeof x === "string") return loadEntries(x);          // a dir path → load from disk
  if (Array.isArray(x)) return x;                            // a raw entries array
  if (x && Array.isArray(x.entries)) return x.entries;       // a log handle
  return [];
}

// Load a persisted chain from disk into a log handle (sealed flag derived from the chain).
export function loadRun(dir) {
  const entries = loadEntries(dir);
  const sealed = entries.some((e) => e.type === ENTRY_TYPE.RUN_SEAL);
  return { dir, entries, sealed };
}
