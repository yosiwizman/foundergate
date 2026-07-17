// VB2 ClassifiedObjectStore — self-test. Covers every spec MUST (docs/lanes/vb2-build-spec.md):
// 128-bit CSPRNG IDs; SHA-256 + pinned canonical JSON; QueueEvent hash chain (intact/broken-at/
// genesis); content-addressed snapshots (dedupe + tamper); lifecycle<->status mapping with distinct
// DISMISSED/EXPIRED + UNKNOWN; classification fail-closed. No act edge is proven by no-act-edge.selftest.
import assert from "node:assert/strict";
import {
  canonicalize, sha256hex, idFromBytes, newId, ID_RE, GENESIS_HASH,
  lifecycleOf, statusForLifecycle, isLegalTransition, LIFECYCLE,
  validateObject, snapshotId, makeSnapshot,
  newStore, appendEvent, verifyChain, objectState, ClassifiedStoreError,
} from "./classified-object-store.mjs";

let pass = 0;
const check = (name, fn) => { fn(); pass++; console.log(`  PASS: ${name}`); };
console.log("== VB2 ClassifiedObjectStore selftest ==");

// ---- W2 item 1: IDs (128-bit, CSPRNG-shape) ----
check("idFromBytes: 16 bytes -> ^q[0-9a-f]{32}$ (128 bits), deterministic", () => {
  const bytes = Uint8Array.from(Array.from({ length: 16 }, (_, i) => i));
  const id = idFromBytes(bytes);
  assert.match(id, ID_RE);
  assert.equal(id.length, 33); // "q" + 32 hex
  assert.equal(id, idFromBytes(bytes)); // deterministic
  assert.equal(id, "q000102030405060708090a0b0c0d0e0f");
});
check("idFromBytes rejects non-16-byte input (fail-closed)", () => {
  assert.throws(() => idFromBytes(Uint8Array.from([1, 2, 3])), ClassifiedStoreError);
  assert.throws(() => idFromBytes(null), ClassifiedStoreError);
});
check("newId mints a valid 128-bit id; two mints differ (real entropy)", () => {
  const a = newId(), b = newId();
  assert.match(a, ID_RE); assert.match(b, ID_RE);
  assert.notEqual(a, b);
});

// ---- W2 item 2: canonical JSON + SHA-256 ----
check("canonicalize is key-order-independent and hashes identically", () => {
  const x = { b: 1, a: [3, 2, 1], c: { z: true, y: "q" } };
  const y = { c: { y: "q", z: true }, a: [3, 2, 1], b: 1 };
  assert.equal(canonicalize(x), canonicalize(y));
  assert.equal(sha256hex(canonicalize(x)), sha256hex(canonicalize(y)));
  assert.equal(canonicalize(x), '{"a":[3,2,1],"b":1,"c":{"y":"q","z":true}}'); // no whitespace, sorted
});
check("canonicalize rejects non-finite numbers (fail-closed)", () => {
  assert.throws(() => canonicalize({ n: NaN }), ClassifiedStoreError);
  assert.throws(() => canonicalize({ n: Infinity }), ClassifiedStoreError);
});
check("content-addressed snapshot: identical content -> identical id; a byte change -> different id", () => {
  const s1 = makeSnapshot({ title: "x", n: 1 });
  const s2 = makeSnapshot({ n: 1, title: "x" }); // reordered, same content
  assert.equal(s1.snapshot_id, s2.snapshot_id);
  assert.match(s1.snapshot_id, /^s[0-9a-f]{64}$/);
  assert.notEqual(snapshotId({ title: "x", n: 1 }), snapshotId({ title: "x", n: 2 }));
});

// ---- W2 item 2: QueueEvent hash chain ----
check("appendEvent builds a genesis-anchored chain; verifyChain -> intact", () => {
  let st = newStore();
  st = appendEvent(st, { at: "2026-07-18T00:00:00Z", kind: "create", object_id: "q".padEnd(33, "0") });
  st = appendEvent(st, { at: "2026-07-18T00:01:00Z", kind: "transition", object_id: "q".padEnd(33, "0"), payload: { from: "PENDING", to: "RESOLVED" } });
  assert.equal(st.events[0].previous_hash, GENESIS_HASH);
  assert.equal(st.events[1].previous_hash, st.events[0].event_hash);
  assert.equal(verifyChain(st), "intact");
});
check("chain tamper -> broken-at-<id>; deletion/reorder -> broken-at", () => {
  let st = newStore();
  st = appendEvent(st, { at: "2026-07-18T00:00:00Z", kind: "create", object_id: "o" });
  st = appendEvent(st, { at: "2026-07-18T00:01:00Z", kind: "note", object_id: "o", payload: { x: 1 } });
  st = appendEvent(st, { at: "2026-07-18T00:02:00Z", kind: "note", object_id: "o", payload: { x: 2 } });
  assert.equal(verifyChain(st), "intact");
  // byte-edit a middle event's payload without recomputing its hash
  const tampered = { ...st, events: st.events.map((e, i) => i === 1 ? { ...e, payload: { x: 999 } } : e) };
  assert.equal(verifyChain(tampered), "broken-at-e1");
  // delete a middle event (seq/linkage shifts): caught at the surviving event whose baked-in
  // id is e2 but now sits at index 1 -> seq mismatch -> broken-at-e2.
  const deleted = { ...st, events: [st.events[0], st.events[2]] };
  assert.equal(verifyChain(deleted), "broken-at-e2");
});
check("appendEvent is pure — does not mutate the input store", () => {
  const st0 = newStore();
  const st1 = appendEvent(st0, { at: "2026-07-18T00:00:00Z", kind: "create", object_id: "o" });
  assert.equal(st0.events.length, 0);
  assert.equal(st1.events.length, 1);
});
check("appendEvent requires timestamp DATA + kind (no clock)", () => {
  assert.throws(() => appendEvent(newStore(), { kind: "create" }), ClassifiedStoreError);
  assert.throws(() => appendEvent(newStore(), { at: "2026-07-18T00:00:00Z" }), ClassifiedStoreError);
});

// ---- W2 item 3: lifecycle <-> status mapping (distinct DISMISSED/EXPIRED + UNKNOWN) ----
check("lifecycleOf maps every status/resolution; DISMISSED and EXPIRED are DISTINCT and first-class", () => {
  assert.equal(lifecycleOf({ status: "queued" }), "PENDING");
  assert.equal(lifecycleOf({ status: "blocked" }), "BLOCKED");
  assert.equal(lifecycleOf({ status: "done", resolution: "dismissed" }), "DISMISSED");
  assert.equal(lifecycleOf({ status: "done", resolution: "expired" }), "EXPIRED");
  assert.equal(lifecycleOf({ status: "done", resolution: "resolved" }), "RESOLVED");
  assert.notEqual(lifecycleOf({ status: "done", resolution: "dismissed" }), lifecycleOf({ status: "done", resolution: "expired" }));
});
check("UNKNOWN is never guessed (Law 54): bare done or UNKNOWN status -> UNKNOWN", () => {
  assert.equal(lifecycleOf({ status: "done" }), "UNKNOWN"); // no resolution -> not guessed
  assert.equal(lifecycleOf({ status: "UNKNOWN" }), "UNKNOWN");
  assert.equal(lifecycleOf(null), "UNKNOWN");
});
check("statusForLifecycle is the exact inverse; transitions legal/illegal enforced", () => {
  for (const s of LIFECYCLE) {
    const m = statusForLifecycle(s);
    if (s !== "UNKNOWN") assert.equal(lifecycleOf(m), s);
  }
  assert.equal(isLegalTransition("PENDING", "DISMISSED"), true);
  assert.equal(isLegalTransition("PENDING", "EXPIRED"), true);
  assert.equal(isLegalTransition("RESOLVED", "PENDING"), false); // terminal
  assert.equal(isLegalTransition("DISMISSED", "RESOLVED"), false); // terminal
});
check("objectState folds the chain; EXPIRED reachable only via a retention (retire-expired) event", () => {
  let st = newStore();
  st = appendEvent(st, { at: "t0", kind: "create", object_id: "o" });
  assert.equal(objectState(st, "o").lifecycle, "PENDING");
  // a bare transition to EXPIRED is IGNORED (must go through retire-expired)
  let bad = appendEvent(st, { at: "t1", kind: "transition", object_id: "o", payload: { from: "PENDING", to: "EXPIRED" } });
  assert.equal(objectState(bad, "o").lifecycle, "PENDING");
  let good = appendEvent(st, { at: "t1", kind: "retire-expired", object_id: "o" });
  assert.equal(objectState(good, "o").lifecycle, "EXPIRED");
  assert.deepEqual(statusForLifecycle(objectState(good, "o").lifecycle), { status: "done", resolution: "expired" });
});

// ---- Classification enforcement (fail-closed) ----
check("validateObject rejects SECRET/BLOCKED/UNKNOWN data class and non-128-bit ids; accepts PUBLIC/INTERNAL", () => {
  const goodId = idFromBytes(Uint8Array.from(Array.from({ length: 16 }, () => 7)));
  assert.equal(validateObject({ id: goodId, data_class: "PUBLIC" }).valid, true);
  assert.equal(validateObject({ id: goodId, data_class: "INTERNAL" }).valid, true);
  assert.equal(validateObject({ id: goodId, data_class: "SECRET" }).valid, false);
  assert.equal(validateObject({ id: goodId, data_class: "BLOCKED" }).valid, false);
  assert.equal(validateObject({ id: goodId, data_class: "UNKNOWN" }).valid, false);
  assert.equal(validateObject({ id: "q" + "0".repeat(12), data_class: "PUBLIC" }).valid, false); // 48-bit legacy id rejected
});

console.log(`\nVB2-CLASSIFIED-OBJECT-STORE-SELFTEST: PASS ${pass}`);
process.exit(0);
