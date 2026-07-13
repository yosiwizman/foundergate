// L2 RUN ATTESTATION — canonical serialization + hashing primitives.
//
// Authority: docs/lanes/shared-host-workload-lease.md @ 6a4488d8ba728f203e83d0bf0d2ee48c684134af (§28 pin);
//            docs/ASSEMBLY_MANUAL.md @ a2c4a10adc88d7de760cd8f4f0c0595458f5c6c6 §26 (append-only evidence +
//            exact-SHA provenance) and Law 54 (never report an unverifiable record as intact).
//
// Zero external deps: only node:crypto. No wall-clock read — timestamps are DATA passed in by callers.
//
// canonicalize() produces a deterministic, key-sorted JSON string so a hash over an entry is stable
// regardless of key insertion order. This is what makes a byte-level edit detectable: re-serializing a
// tampered entry yields a different string, hence a different SHA-256, hence a broken chain.

import { createHash } from "node:crypto";

// Deterministic JSON: object keys emitted in sorted order, recursively. Rejects values that cannot be
// faithfully hashed (undefined, functions, symbols, NaN/Infinity) so no ambiguity ever enters the chain.
export function canonicalize(value) {
  return _enc(value);
}

function _enc(v) {
  if (v === null) return "null";
  const t = typeof v;
  if (t === "number") {
    if (!Number.isFinite(v)) throw new TypeError(`non-finite number cannot be attested: ${v}`);
    return JSON.stringify(v);
  }
  if (t === "boolean") return v ? "true" : "false";
  if (t === "string") return JSON.stringify(v);
  if (t === "bigint") return `"${v.toString()}"`;
  if (Array.isArray(v)) return `[${v.map(_enc).join(",")}]`;
  if (t === "object") {
    const keys = Object.keys(v).sort();
    const parts = [];
    for (const k of keys) {
      const val = v[k];
      if (val === undefined || typeof val === "function" || typeof val === "symbol") {
        throw new TypeError(`un-attestable value at key "${k}" (${typeof val})`);
      }
      parts.push(`${JSON.stringify(k)}:${_enc(val)}`);
    }
    return `{${parts.join(",")}}`;
  }
  throw new TypeError(`un-attestable value of type ${t}`);
}

export function sha256Hex(str) {
  return createHash("sha256").update(str, "utf8").digest("hex");
}

// The genesis link: the previous_hash of the first entry in every chain (64 hex zeros).
export const GENESIS_HASH = "0".repeat(64);

// Hash the immutable substance of an entry. entry_hash and id are DERIVED and therefore excluded — the
// hash covers version, sequence, type, timestamp (DATA), payload, and the previous_hash link.
export function hashEntry(entry) {
  const substance = {
    v: entry.v,
    seq: entry.seq,
    type: entry.type,
    at: entry.at,
    payload: entry.payload,
    previous_hash: entry.previous_hash,
  };
  return sha256Hex(canonicalize(substance));
}
