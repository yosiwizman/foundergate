// FounderGate LRCQ — Independent externally-anchorable evidence (A04).
// A hash-chained, tamper-evident, write-once evidence ledger with a DETERMINISTIC local signing
// fixture (HMAC over the canonical digest) and an explicit external-witness signature slot that
// stays HELD until a real third-party anchor is applied. NO real timestamp service, NO production
// signing key, NO external write-once storage are used here — those remain HELD limitations.
import { createHash, createHmac } from "node:crypto";
import { canonicalize } from "./evidence-spec.mjs";

export const ANCHOR_LIMITATIONS = [
  "external timestamp service: HELD (not contacted)",
  "production signing key: HELD (deterministic test key only)",
  "external write-once storage: HELD (in-process append-only only)",
];

const digestOf = (obj) => "sha256:" + createHash("sha256").update(canonicalize(obj)).digest("hex");

// Deterministic local signing fixture (NOT a production key).
export function signFixture(digest, key = "foundergate-test-anchor-key") { return "hmac-sha256:" + createHmac("sha256", key).update(digest).digest("hex"); }
export function verifyFixtureSig(digest, sig, key = "foundergate-test-anchor-key") { return sig === signFixture(digest, key); }

// Hash-chained append-only ledger. Each record binds the previous record's chain digest.
export class AnchorLedger {
  constructor() { this.records = []; this.head = "sha256:genesis"; this._sealed = false; }
  append(record) {
    if (this._sealed) throw new Error("ledger sealed (write-once)");
    const body = { seq: this.records.length, prev: this.head, record };
    const chain_digest = digestOf(body);
    const signed = { ...body, chain_digest, signature: signFixture(chain_digest), external_witness_signature: null }; // witness slot HELD
    this.records.push(signed); this.head = chain_digest;
    return signed;
  }
  // verify the whole chain: prev linkage + per-record digest + signature; detect tamper/insertion.
  verify() {
    let prev = "sha256:genesis";
    for (let i = 0; i < this.records.length; i++) {
      const rec = this.records[i];
      if (rec.seq !== i) return { ok: false, reason: "seq mismatch at " + i };
      if (rec.prev !== prev) return { ok: false, reason: "chain break at " + i };
      const expect = digestOf({ seq: rec.seq, prev: rec.prev, record: rec.record });
      if (expect !== rec.chain_digest) return { ok: false, reason: "tampered record at " + i };
      if (!verifyFixtureSig(rec.chain_digest, rec.signature)) return { ok: false, reason: "bad signature at " + i };
      prev = rec.chain_digest;
    }
    return { ok: true, head: this.head, length: this.records.length };
  }
  // checkpoint manifest: a compact, verifiable summary of the sealed chain for export.
  checkpointManifest(candidate) {
    return {
      candidate_sha: candidate.candidate_sha, candidate_tree: candidate.candidate_tree,
      chain_head: this.head, record_count: this.records.length,
      external_witness_signature: null, // HELD until real anchor
      limitations: ANCHOR_LIMITATIONS, local_signature: signFixture(this.head),
    };
  }
  // write-once export: seals the ledger; a second export refuses.
  exportOnce() {
    if (this._sealed) return { ok: false, reason: "already exported (write-once)" };
    this._sealed = true;
    return { ok: true, head: this.head, records: this.records };
  }
}

// Verify an exported chain independently of the originating runtime (no AnchorLedger instance).
export function verifyExportedChain(exported) {
  const l = new AnchorLedger();
  l.records = exported.records || []; l.head = exported.head;
  return l.verify();
}
