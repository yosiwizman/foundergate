// L2 RUN ATTESTATION — self-test. Green here == proof in this repo (the single proof that counts).
//
// Covers: chain integrity (edit / delete / reorder -> broken-at); span-too-short -> not eligible;
// unresolved-failure -> not eligible; genuine record verifies + is eligible; unverifiable -> UNKNOWN;
// on-disk round-trip + on-disk tamper detected; and the invariant that NO SOAK PASS line is ever emitted.
//
// Uses OS-temp dirs only; never touches the real home or any lane's on-disk state. No Date.now().

import assert from "node:assert/strict";
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  openRun, appendEvent, recordMonitoringWindow, recordFailure, resolveFailure,
  sealRun, verifyAttestation, isSoakEligible, loadRun, logPath, ENTRY_TYPE,
} from "./index.mjs";
import { hashEntry, GENESIS_HASH } from "./canonical.mjs";

// ---- tiny harness (matches repo style; independent of src/shwl) -----------------------------------
const roots = [];
function mkRoot(tag = "l2ra") {
  const r = mkdtempSync(join(tmpdir(), `${tag}-`));
  if (!r.startsWith(tmpdir())) throw new Error(`REFUSED: temp root not under OS temp dir: ${r}`);
  roots.push(r);
  return r;
}
function cleanup() {
  for (const r of roots.splice(0)) { try { if (existsSync(r)) rmSync(r, { recursive: true, force: true }); } catch { /* best effort */ } }
}
let pass = 0;
console.log("== L2 run-attestation (append-only, hash-chained) ==");
function check(name, fn) { fn(); pass++; console.log(`  PASS: ${name}`); }

// Fixed DATA timestamps — never a clock read.
const START = "2026-07-13T00:00:00.000Z";
const START_MS = Date.parse(START);
const HOUR = 3600 * 1000;

function baseRun(over = {}) {
  return {
    run_id: "run_TEST_1",
    host_id: "host_ABC",
    boot_id: "boot_XYZ",
    freeze_manifest_hash: "sha256:FREEZE_FROM_L1_AS_DATA", // opaque DATA, not imported
    lease_id: "lease_FROM_SHWL_AS_DATA",                   // opaque DATA, not re-derived
    start_at: START,
    monitoring_window_refs: ["mon://window/1"],
    failures_log_ref: "file://failures.log",
    ...over,
  };
}

// Build a genuine, sealed, 9-hour clean run in memory.
function genuineNineHourRun() {
  const log = openRun({ run: baseRun(), at: START });
  recordMonitoringWindow(log, { at: new Date(START_MS + 1 * HOUR).toISOString(), ref: "mon://window/1h" });
  appendEvent(log, { at: new Date(START_MS + 2 * HOUR).toISOString(), payload: { note: "healthy" } });
  sealRun(log, { end_at: new Date(START_MS + 9 * HOUR).toISOString(), at: new Date(START_MS + 9 * HOUR).toISOString() });
  return log;
}

const headHash = (log) => log.entries[log.entries.length - 1].entry_hash;

// Simulate a same-user attacker who controls the WHOLE file: recompute seq/id/previous_hash/entry_hash
// for every entry from the public GENESIS_HASH, so the rewritten chain is internally content-consistent.
function forgeChain(entries) {
  let prev = GENESIS_HASH;
  return entries.map((e, i) => {
    const rebuilt = { ...e, seq: i, id: `entry-${i}`, previous_hash: prev };
    delete rebuilt.entry_hash;
    rebuilt.entry_hash = hashEntry(rebuilt);
    prev = rebuilt.entry_hash;
    return rebuilt;
  });
}

// ---------------------------------------------------------------------------------------------------
check("genuine sealed 9h run verifies intact AND is soak-eligible for a 9h claim", () => {
  const log = genuineNineHourRun();
  assert.equal(verifyAttestation(log), "intact");
  const r = isSoakEligible(log, { claimSeconds: 9 * 3600 });
  assert.equal(r.eligible, true);
  assert.equal(r.status, "ELIGIBLE");
  assert.equal(r.spanSeconds, 9 * 3600);
  assert.deepEqual(r.unresolvedFailures, []);
});

check("EDIT of a payload byte is detected -> broken-at that entry", () => {
  const log = genuineNineHourRun();
  const entries = structuredClone(log.entries);
  entries[1].payload.ref = "mon://window/TAMPERED"; // edit without re-hashing
  const v = verifyAttestation(entries);
  assert.equal(v, "broken-at-entry-1");
});

check("EDIT that also recomputes entry_hash is STILL detected (previous_hash link breaks downstream)", () => {
  const log = genuineNineHourRun();
  const entries = structuredClone(log.entries);
  entries[1].payload.ref = "mon://window/TAMPERED";
  entries[1].entry_hash = hashEntry(entries[1]); // attacker re-hashes the edited entry
  const v = verifyAttestation(entries);
  // entry-1 now self-consistent, but entry-2.previous_hash no longer matches -> broken at entry-2.
  assert.equal(v, "broken-at-entry-2");
});

check("DELETE of a middle entry is detected -> broken-at", () => {
  const log = genuineNineHourRun();
  const entries = structuredClone(log.entries);
  entries.splice(1, 1); // remove entry-1; positions shift, seq no longer matches index
  const v = verifyAttestation(entries);
  assert.equal(v, "broken-at-entry-2"); // the entry that was seq=2 now sits at index 1
});

check("REORDER of two entries is detected -> broken-at", () => {
  const log = genuineNineHourRun();
  const entries = structuredClone(log.entries);
  const tmp = entries[1]; entries[1] = entries[2]; entries[2] = tmp; // swap
  const v = verifyAttestation(entries);
  // position 1 should hold seq=1 but now holds the object whose id is entry-2 -> first anomaly.
  assert.equal(v, "broken-at-entry-2");
});

check("span-too-short -> NOT eligible (honest, verified chain)", () => {
  const log = openRun({ run: baseRun(), at: START });
  sealRun(log, { end_at: new Date(START_MS + 2 * HOUR).toISOString(), at: new Date(START_MS + 2 * HOUR).toISOString() });
  assert.equal(verifyAttestation(log), "intact");
  const r = isSoakEligible(log, { claimSeconds: 9 * 3600 });
  assert.equal(r.eligible, false);
  assert.equal(r.status, "NOT_ELIGIBLE");
  assert.match(r.reason, /span .* < claimed/);
});

check("unresolved failure -> NOT eligible even when span is long enough", () => {
  const log = openRun({ run: baseRun(), at: START });
  recordFailure(log, { at: new Date(START_MS + 1 * HOUR).toISOString(), failure_id: "F1", detail: "oom" });
  sealRun(log, { end_at: new Date(START_MS + 9 * HOUR).toISOString(), at: new Date(START_MS + 9 * HOUR).toISOString() });
  const r = isSoakEligible(log, { claimSeconds: 9 * 3600 });
  assert.equal(r.eligible, false);
  assert.equal(r.status, "NOT_ELIGIBLE");
  assert.deepEqual(r.unresolvedFailures, ["F1"]);
});

check("a RESOLVED failure no longer blocks eligibility", () => {
  const log = openRun({ run: baseRun(), at: START });
  recordFailure(log, { at: new Date(START_MS + 1 * HOUR).toISOString(), failure_id: "F1" });
  resolveFailure(log, { at: new Date(START_MS + 2 * HOUR).toISOString(), failure_id: "F1", resolution: "restarted" });
  sealRun(log, { end_at: new Date(START_MS + 9 * HOUR).toISOString(), at: new Date(START_MS + 9 * HOUR).toISOString() });
  const r = isSoakEligible(log, { claimSeconds: 9 * 3600 });
  assert.equal(r.eligible, true);
  assert.deepEqual(r.unresolvedFailures, []);
});

check("an UNSEALED run is NOT eligible (no end_at)", () => {
  const log = openRun({ run: baseRun(), at: START });
  appendEvent(log, { at: new Date(START_MS + 1 * HOUR).toISOString(), payload: { note: "still running" } });
  const r = isSoakEligible(log, { claimSeconds: 3600 });
  assert.equal(r.eligible, false);
  assert.equal(r.status, "NOT_ELIGIBLE");
  assert.match(r.reason, /not sealed/);
});

check("UNVERIFIABLE chain -> UNKNOWN, never eligible (Law 54)", () => {
  const log = genuineNineHourRun();
  const entries = structuredClone(log.entries);
  entries[2].payload.note = "silently changed"; // tamper without rehash
  const r = isSoakEligible(entries, { claimSeconds: 1 }); // span would pass, but chain is broken
  assert.equal(r.eligible, false);
  assert.equal(r.status, "UNKNOWN");
  assert.match(r.verdict, /^broken-at-/);
});

check("appending after seal is refused (append-only sealed record)", () => {
  const log = genuineNineHourRun();
  assert.throws(() => appendEvent(log, { at: START, payload: {} }), /sealed/);
});

check("openRun rejects a run record missing a required field", () => {
  assert.throws(() => openRun({ run: baseRun({ lease_id: "" }), at: START }), /lease_id is required/);
  assert.throws(() => openRun({ run: baseRun({ freeze_manifest_hash: undefined }), at: START }), /freeze_manifest_hash is required/);
});

// ---- disk-backed (OS temp dir) --------------------------------------------------------------------
check("DISK round-trip: append-only log persists, reloads, and verifies intact", () => {
  const dir = mkRoot();
  const log = openRun({ dir, run: baseRun(), at: START });
  recordMonitoringWindow(log, { at: new Date(START_MS + 1 * HOUR).toISOString(), ref: "mon://w" });
  sealRun(log, { end_at: new Date(START_MS + 9 * HOUR).toISOString(), at: new Date(START_MS + 9 * HOUR).toISOString() });
  assert.ok(existsSync(logPath(dir)));
  const reloaded = loadRun(dir);
  assert.equal(reloaded.sealed, true);
  assert.equal(verifyAttestation(reloaded), "intact");
  assert.equal(verifyAttestation(dir), "intact"); // verify accepts a dir path too
  const r = isSoakEligible(dir, { claimSeconds: 9 * 3600 });
  assert.equal(r.eligible, true);
});

check("ON-DISK tamper (a hand-edited line) is detected by re-walking the chain", () => {
  const dir = mkRoot();
  const log = openRun({ dir, run: baseRun(), at: START });
  recordMonitoringWindow(log, { at: new Date(START_MS + 1 * HOUR).toISOString(), ref: "mon://w" });
  sealRun(log, { end_at: new Date(START_MS + 9 * HOUR).toISOString(), at: new Date(START_MS + 9 * HOUR).toISOString() });
  // hand-edit line 1 (the monitoring entry) on disk without rehashing
  const lines = readFileSync(logPath(dir), "utf8").split("\n").filter((s) => s.trim() !== "");
  const obj = JSON.parse(lines[1]);
  obj.payload.ref = "mon://TAMPERED-ON-DISK";
  lines[1] = JSON.stringify(obj);
  writeFileSync(logPath(dir), lines.join("\n") + "\n", "utf8");
  const v = verifyAttestation(dir);
  assert.equal(v, "broken-at-entry-1");
  const r = isSoakEligible(dir, { claimSeconds: 1 });
  assert.equal(r.status, "UNKNOWN");
  assert.equal(r.eligible, false);
});

// ---- F1: full-chain-rewrite residual + external anchor --------------------------------------------
check("F1 DISCLOSED RESIDUAL: a full-chain rewrite (2h forged to 9h) passes as intact WITHOUT an anchor", () => {
  // Genuine short run: 2 hours, sealed.
  const log = openRun({ run: baseRun(), at: START });
  sealRun(log, { end_at: new Date(START_MS + 2 * HOUR).toISOString(), at: new Date(START_MS + 2 * HOUR).toISOString() });
  // Attacker controls the whole file: rewrite end_at to 9h and rebuild every hash from GENESIS_HASH.
  const tampered = structuredClone(log.entries);
  tampered[tampered.length - 1].payload.end_at = new Date(START_MS + 9 * HOUR).toISOString();
  const forged = forgeChain(tampered);
  // This is the ACCEPTED residual (same class as SHWL events.log under same-user tampering): content-
  // addressed verification alone CANNOT distinguish a full rewrite from a genuine record.
  assert.equal(verifyAttestation(forged), "intact");
  const r = isSoakEligible(forged, { claimSeconds: 9 * 3600 });
  assert.equal(r.eligible, true, "without an external anchor the forgery is not detectable — disclosed residual");
});

check("F1 FIX (b): a correct external anchor verifies intact; any content change => broken-anchor (never intact)", () => {
  const genuine = genuineNineHourRun();
  const anchor = headHash(genuine); // caller records this out-of-band (e.g. in the L1 freeze manifest)
  assert.equal(verifyAttestation(genuine, { expectedHeadHash: anchor }), "intact");
  // Attacker full-rewrites (changes a monitoring ref) — content-addressed check still says intact...
  const tampered = structuredClone(genuine.entries);
  tampered[1].payload.ref = "mon://window/EVIL";
  const forged = forgeChain(tampered);
  assert.equal(verifyAttestation(forged), "intact");
  // ...but the external anchor the attacker does not control catches it, fail-closed.
  assert.equal(verifyAttestation(forged, { expectedHeadHash: anchor }), "broken-anchor");
  const r = isSoakEligible(forged, { claimSeconds: 9 * 3600, expectedHeadHash: anchor });
  assert.equal(r.status, "UNKNOWN");
  assert.equal(r.eligible, false);
  assert.equal(r.verdict, "broken-anchor");
});

check("genesis_salt gives run-distinguishability: identical DATA, different salt => different head hash", () => {
  const a = openRun({ run: baseRun({ genesis_salt: "salt-A" }), at: START });
  const b = openRun({ run: baseRun({ genesis_salt: "salt-B" }), at: START });
  assert.notEqual(headHash(a), headHash(b));
  assert.equal(verifyAttestation(a), "intact");
  assert.equal(verifyAttestation(b), "intact");
});

// ---- LOW-1: intact chain with unparseable timestamp => UNKNOWN, never throw ------------------------
check("LOW-1: content-intact chain with an un-parseable end_at => UNKNOWN (no throw, never eligible)", () => {
  const log = genuineNineHourRun();
  const tampered = structuredClone(log.entries);
  tampered[tampered.length - 1].payload.end_at = "not-a-real-timestamp"; // garbage that still hashes fine
  const forged = forgeChain(tampered);
  assert.equal(verifyAttestation(forged), "intact"); // content-addressed check passes
  const r = isSoakEligible(forged, { claimSeconds: 1 }); // must NOT throw
  assert.equal(r.status, "UNKNOWN");
  assert.equal(r.eligible, false);
});

// ---- LOW-2: verify forbids anything after a seal, and a second seal --------------------------------
check("LOW-2: an entry AFTER a RUN_SEAL is broken (even with valid re-hashed linkage)", () => {
  const log = genuineNineHourRun();
  const extra = { v: 1, type: ENTRY_TYPE.EVENT, at: new Date(START_MS + 10 * HOUR).toISOString(), payload: { note: "after seal" } };
  const forged = forgeChain([...structuredClone(log.entries), extra]);
  assert.match(verifyAttestation(forged), /^broken-at-/);
});

check("LOW-2: a SECOND RUN_SEAL is broken (double-seal rejected)", () => {
  const log = openRun({ run: baseRun(), at: START });
  appendEvent(log, { at: new Date(START_MS + 1 * HOUR).toISOString(), payload: { note: "x" } });
  sealRun(log, { end_at: new Date(START_MS + 9 * HOUR).toISOString(), at: new Date(START_MS + 9 * HOUR).toISOString() });
  const secondSeal = { v: 1, type: ENTRY_TYPE.RUN_SEAL, at: new Date(START_MS + 9 * HOUR).toISOString(), payload: { end_at: new Date(START_MS + 9 * HOUR).toISOString() } };
  const forged = forgeChain([...structuredClone(log.entries), secondSeal]);
  assert.match(verifyAttestation(forged), /^broken-at-/);
});

// ---- report-provenance invariant: NEVER emit a SOAK PASS line -------------------------------------
check("eligibility result carries NO soak-pass claim and NO 'SOAK PASS' string anywhere", () => {
  const log = genuineNineHourRun();
  const r = isSoakEligible(log, { claimSeconds: 9 * 3600 });
  assert.equal(r.eligible, true);
  const keys = Object.keys(r);
  assert.ok(!keys.some((k) => /soak.?pass|pass.?line/i.test(k)), "no soak-pass key on the result");
  assert.ok(!/SOAK PASS/i.test(JSON.stringify(r)), "no 'SOAK PASS' text in the eligibility result");
});

check("no source file emits a soak-pass banner literal or calls Date.now()", () => {
  const here = fileURLToPath(new URL(".", import.meta.url));
  for (const f of ["attestation.mjs", "canonical.mjs", "store.mjs", "index.mjs"]) {
    const src = readFileSync(join(here, f), "utf8");
    // "SOAK PASS" appears only in comments that forbid it; what is banned is a STRING LITERAL that would
    // actually print the banner. There must be no such literal.
    assert.ok(
      !/["'`][^"'`\n]*HARNESS[^"'`\n]*SOAK PASS[^"'`\n]*["'`]/i.test(src),
      `no soak-pass banner literal allowed in ${f}`,
    );
    assert.ok(!/Date\.now\s*\(/.test(src), `Date.now() must not appear in ${f}`);
  }
});

console.log(`L2-RUN-ATTESTATION-SELFTEST: PASS (${pass} checks)`);
cleanup();
process.exit(0);
