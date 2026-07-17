// FounderGate V8-B VB2 — CLASSIFIED OBJECT STORE (built per docs/lanes/vb2-build-spec.md,
// released by founder gate G-VB2-BUILD-RELEASE). Zero-dependency Node ESM.
//
// Scope discipline (build contract): a NON-EXECUTING data store. There is NO act / approve /
// execute / send path here — that stays VB3. Enforced by no-act-edge.selftest.mjs (which scans
// this module). Time is DATA passed in (no clock). The ONLY non-determinism is entropy for ID
// minting, isolated in newId() and injectable via idFromBytes(bytes); createHash is pure.
//
// Resolves the three W2 must-fix items exactly as specified:
//   1. IDs: 128-bit CSPRNG, pattern ^q[0-9a-f]{32}$ (ID is not an authorization boundary).
//   2. Hash: SHA-256 over a pinned canonical JSON (sorted keys, no whitespace, number rule).
//      QueueEvent hash chain (event_hash / previous_hash / genesis) + content-addressed snapshots.
//   3. Lifecycle <-> status mapping with distinct, first-class DISMISSED / EXPIRED (+ UNKNOWN).

import { createHash, randomBytes } from "node:crypto";
import { DATA_CLASS, FORBIDDEN_DATA_CLASS, UNKNOWN } from "./cto-queue.mjs";

export class ClassifiedStoreError extends Error {
  constructor(msg) { super(msg); this.name = "ClassifiedStoreError"; }
}

export const GENESIS_HASH = "0".repeat(64);
export const ID_RE = /^q[0-9a-f]{32}$/; // "q" + 128 bits of hex

// ---------------------------------------------------------------------------------------------
// Pinned canonical JSON (W2 item 2). Deterministic: object keys sorted by UTF-16 code unit,
// arrays keep order, no insignificant whitespace, numbers as shortest round-tripping decimal
// (integers with no exponent), NaN / +-Infinity rejected, undefined/function rejected.
// ---------------------------------------------------------------------------------------------
export function canonicalize(v) {
  if (v === null) return "null";
  const t = typeof v;
  if (t === "number") {
    if (!Number.isFinite(v)) throw new ClassifiedStoreError("canonicalize: non-finite number");
    return JSON.stringify(v); // shortest round-tripping decimal; integers have no exponent
  }
  if (t === "boolean") return v ? "true" : "false";
  if (t === "string") return JSON.stringify(v);
  if (Array.isArray(v)) return "[" + v.map(canonicalize).join(",") + "]";
  if (t === "object") {
    const keys = Object.keys(v).filter((k) => v[k] !== undefined).sort();
    return "{" + keys.map((k) => JSON.stringify(k) + ":" + canonicalize(v[k])).join(",") + "}";
  }
  throw new ClassifiedStoreError(`canonicalize: unsupported value type ${t}`);
}

export function sha256hex(str) { return createHash("sha256").update(str, "utf8").digest("hex"); }

// ---------------------------------------------------------------------------------------------
// W2 item 1 — IDs. idFromBytes is pure (deterministic given 16 bytes); newId mints CSPRNG entropy.
// ID entropy is NOT the authorization boundary — the data-class boundary below gates content.
// ---------------------------------------------------------------------------------------------
export function idFromBytes(bytes) {
  const b = bytes && (bytes.length !== undefined ? bytes : null);
  if (!b || b.length !== 16) throw new ClassifiedStoreError("idFromBytes: needs exactly 16 bytes (128 bits)");
  const hex = Array.from(b, (x) => (x & 0xff).toString(16).padStart(2, "0")).join("");
  return "q" + hex;
}
export function newId() { return idFromBytes(randomBytes(16)); } // production CSPRNG minter

// ---------------------------------------------------------------------------------------------
// W2 item 3 — lifecycle <-> scaffold status. Distinct, first-class DISMISSED / EXPIRED.
// ---------------------------------------------------------------------------------------------
export const LIFECYCLE = Object.freeze(["PENDING", "BLOCKED", "DISMISSED", "EXPIRED", "RESOLVED", "UNKNOWN"]);
export const RESOLUTION = Object.freeze(["resolved", "dismissed", "expired"]);

// Map a stored {status, resolution} to its lifecycle state (Law 54: never guess -> UNKNOWN).
export function lifecycleOf(obj) {
  if (!obj || typeof obj !== "object") return "UNKNOWN";
  switch (obj.status) {
    case "queued": return "PENDING";
    case "blocked": return "BLOCKED";
    case "done":
      if (obj.resolution === "dismissed") return "DISMISSED";
      if (obj.resolution === "expired") return "EXPIRED";
      if (obj.resolution === "resolved") return "RESOLVED";
      return "UNKNOWN"; // a bare done with no resolution is ambiguous -> UNKNOWN, not guessed
    case UNKNOWN: return "UNKNOWN";
    default: return "UNKNOWN";
  }
}
// The inverse: the {status, resolution} a lifecycle state maps to.
export function statusForLifecycle(state) {
  switch (state) {
    case "PENDING": return { status: "queued", resolution: null };
    case "BLOCKED": return { status: "blocked", resolution: null };
    case "DISMISSED": return { status: "done", resolution: "dismissed" };
    case "EXPIRED": return { status: "done", resolution: "expired" };
    case "RESOLVED": return { status: "done", resolution: "resolved" };
    case "UNKNOWN": return { status: UNKNOWN, resolution: null };
    default: throw new ClassifiedStoreError(`unknown lifecycle state: ${state}`);
  }
}
// Legal transitions (append-only lifecycle). EXPIRED only via the retention path (event.kind).
const LEGAL = {
  PENDING: new Set(["BLOCKED", "DISMISSED", "EXPIRED", "RESOLVED"]),
  BLOCKED: new Set(["PENDING", "DISMISSED", "EXPIRED", "RESOLVED"]),
  DISMISSED: new Set([]), EXPIRED: new Set([]), RESOLVED: new Set([]), UNKNOWN: new Set([]),
};
export function isLegalTransition(from, to) {
  return LEGAL[from] ? LEGAL[from].has(to) : false;
}

// ---------------------------------------------------------------------------------------------
// Classification enforcement (reuses the accepted scaffold boundary): SECRET/BLOCKED/UNKNOWN
// content may NEVER be stored. Fail-closed on any unrecognised class.
// ---------------------------------------------------------------------------------------------
export function validateObject(obj) {
  const errors = [];
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return { valid: false, errors: ["object must be a plain object"] };
  if (typeof obj.id !== "string" || !ID_RE.test(obj.id)) errors.push("id must match ^q[0-9a-f]{32}$ (128-bit)");
  if (FORBIDDEN_DATA_CLASS.includes(obj.data_class)) errors.push(`data_class ${obj.data_class} is forbidden (SECRET/BLOCKED/UNKNOWN never stored)`);
  else if (!DATA_CLASS.includes(obj.data_class)) errors.push(`data_class must be one of ${DATA_CLASS.join("/")}`);
  return { valid: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------------------------
// Content-addressed snapshot (W2 item 2): immutable, dedupe-safe. snapshot_id = "s"+sha256(canon).
// ---------------------------------------------------------------------------------------------
export function snapshotId(content) { return "s" + sha256hex(canonicalize(content)); }
export function makeSnapshot(content) { return { snapshot_id: snapshotId(content), content }; }

// ---------------------------------------------------------------------------------------------
// QueueEvent hash chain (W2 item 2). Pure: an event carries DATA only (at, kind, object_id,
// payload). event_hash = SHA-256( canonicalize(event_without_event_hash) + "\n" + previous_hash ).
// newStore() -> immutable-ish handle with a pure appendEvent() returning a NEW chain (no mutation
// of inputs). verifyChain() -> "intact" | "broken-at-<id>", fail-closed.
// ---------------------------------------------------------------------------------------------
export function newStore() { return { schema_version: "1.0.0", events: [] }; }

function eventHash(eventNoHash, previous_hash) {
  return sha256hex(canonicalize(eventNoHash) + "\n" + previous_hash);
}

// Append an event. `event` is DATA: { at, kind, object_id?, payload? }. Returns a NEW store.
export function appendEvent(store, event) {
  if (!store || !Array.isArray(store.events)) throw new ClassifiedStoreError("appendEvent: bad store");
  if (!event || typeof event !== "object") throw new ClassifiedStoreError("appendEvent: event must be an object");
  if (typeof event.at !== "string" || !event.at) throw new ClassifiedStoreError("appendEvent: event.at (timestamp DATA) required");
  if (typeof event.kind !== "string" || !event.kind) throw new ClassifiedStoreError("appendEvent: event.kind required");
  const seq = store.events.length;
  const prev = seq === 0 ? GENESIS_HASH : store.events[seq - 1].event_hash;
  const id = `e${seq}`;
  const base = { v: 1, seq, id, at: event.at, kind: event.kind, object_id: event.object_id ?? null, payload: event.payload ?? null };
  const entry = { ...base, previous_hash: prev, event_hash: eventHash(base, prev) };
  return { ...store, events: [...store.events, entry] };
}

export function verifyChain(store) {
  if (!store || !Array.isArray(store.events)) return "broken-at-empty";
  let prev = GENESIS_HASH;
  for (let i = 0; i < store.events.length; i++) {
    const e = store.events[i];
    const idFor = (e && e.id) || `e${i}`;
    if (!e || typeof e !== "object") return `broken-at-${idFor}`;
    if (e.seq !== i) return `broken-at-${idFor}`;
    if (e.previous_hash !== prev) return `broken-at-${idFor}`;
    const { previous_hash, event_hash, ...base } = e;
    if (typeof event_hash !== "string") return `broken-at-${idFor}`;
    if (eventHash(base, previous_hash) !== event_hash) return `broken-at-${idFor}`;
    prev = event_hash;
  }
  return "intact";
}

// Reconstruct the current object state (status/resolution/lifecycle) by folding the chain.
// A transition event carries payload {from, to}; illegal transitions are IGNORED (fail-closed:
// the store cannot be driven into an illegal lifecycle by a malformed event).
export function objectState(store, object_id) {
  let state = null;
  for (const e of store.events) {
    if (e.object_id !== object_id) continue;
    if (e.kind === "create") state = "PENDING";
    // A user transition may reach any legal target EXCEPT EXPIRED — EXPIRED is reachable ONLY via
    // the retention (retire-expired) event, so a bare transition to EXPIRED is ignored (fail-closed).
    else if (e.kind === "transition" && state && e.payload && e.payload.to !== "EXPIRED" && isLegalTransition(state, e.payload.to)) state = e.payload.to;
    else if (e.kind === "retire-expired" && state && isLegalTransition(state, "EXPIRED")) state = "EXPIRED";
  }
  if (state === null) return { lifecycle: "UNKNOWN", ...statusForLifecycle("UNKNOWN") };
  return { lifecycle: state, ...statusForLifecycle(state) };
}
