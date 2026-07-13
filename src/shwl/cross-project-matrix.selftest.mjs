// SHWL §8.1 — CROSS-PROJECT TEST MATRIX (committed, required GREEN before merge).
//
// Authority: docs/lanes/shared-host-workload-lease.md @ 6a4488d8ba728f203e83d0bf0d2ee48c684134af §8.1.
//
// All 14 rows. "AKIOR soak active" is SIMULATED with lease records (owner_project="akior") —
// NO real AKIOR process is run and NOTHING under any AKIOR path is touched. Rows 4 & 14 use a
// REAL subprocess to prove controlled fd delivery and no-inherit / no-leak. Every row uses a
// throwaway temp dir; none touch the real ~/.cldh.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { acquireLock } from "./lock.mjs";
import { simulateActiveOwnerLease } from "./akior-adoption.mjs";
import { guardHeavyOp } from "./guard.mjs";
import { deriveDecision } from "./state-machine.mjs";
import { launchSoak, releaseByLeaseId } from "./launcher.mjs";
import { readLease, readHeartbeat, readEvents } from "./lease-store.mjs";
import { lockHeld } from "./lock.mjs";
import { brokerStdio, closeBroker, capabilityLeaks } from "./capability.mjs";
import { isQuietHostEligible } from "./attestation.mjs";
import { bootId, processStartMarker, isProcessAlive } from "./identity.mjs";
import { EFFECTIVE, DECISION, RECOVERY_REASON } from "./constants.mjs";
import { mkRoot, fixedIdentity, ALIVE, T0 } from "./_testkit.mjs";

const CHILD = join(dirname(fileURLToPath(import.meta.url)), "_subprocess-child.mjs");
const BOOT = "boot_TEST_1";
const results = [];
let pass = 0;
function row(n, name, fn) {
  fn();
  pass++;
  results.push(`  ROW ${n} GREEN: ${name}`);
  console.log(`  ROW ${n} GREEN: ${name}`);
}

console.log("== SHWL §8.1 cross-project matrix (14 rows) ==");

// Row 1 — AKIOR soak active -> FounderGate build attempts -> REFUSE.
row(1, "AKIOR soak active -> FounderGate build => REFUSE", () => {
  const root = mkRoot("m1");
  simulateActiveOwnerLease(root, { owner_project: "akior", identity: fixedIdentity({ boot_id: BOOT }), now: T0 });
  const r = guardHeavyOp({ root, op: "build", requester: { run_id: "fg-build", capability: "x".repeat(64) }, currentBootId: BOOT, now: T0 + 1000, isAlive: ALIVE });
  assert.equal(r.allowed, false);
  assert.equal(r.effective, EFFECTIVE.ACTIVE_HELD);
});

// Row 2 — FounderGate soak active -> AKIOR build attempts -> REFUSE.
row(2, "FounderGate soak active -> AKIOR build => REFUSE", () => {
  const root = mkRoot("m2");
  simulateActiveOwnerLease(root, { owner_project: "foundergate", identity: fixedIdentity({ boot_id: BOOT }), now: T0 });
  const r = guardHeavyOp({ root, op: "build", requester: { run_id: "akior-build", capability: "y".repeat(64) }, currentBootId: BOOT, now: T0 + 1000, isAlive: ALIVE });
  assert.equal(r.allowed, false);
  assert.equal(r.effective, EFFECTIVE.ACTIVE_HELD);
});

// Row 3 — AKIOR soak active -> a SECOND AKIOR build attempts -> REFUSE (same project != same run).
row(3, "AKIOR soak active -> second AKIOR build => REFUSE (label is not an access grant)", () => {
  const root = mkRoot("m3");
  simulateActiveOwnerLease(root, { owner_project: "akior", run_id: "akior-soak", identity: fixedIdentity({ boot_id: BOOT }), now: T0 });
  const r = guardHeavyOp({ root, op: "build", requester: { run_id: "akior-other-build", capability: "z".repeat(64) }, currentBootId: BOOT, now: T0 + 1000, isAlive: ALIVE });
  assert.equal(r.allowed, false);
  assert.equal(r.effective, EFFECTIVE.ACTIVE_HELD);
});

// Row 4 — exact authorized soak SUBPROCESS (matching capability, delivered via fd) -> ALLOW.
row(4, "exact authorized subprocess (fd-delivered capability) => ALLOW", () => {
  const root = mkRoot("m4");
  const realBoot = bootId({ env: {} });
  const realMarker = processStartMarker(process.pid);
  const sim = simulateActiveOwnerLease(root, {
    owner_project: "akior", run_id: "r4",
    identity: { host_id: "host_x", boot_id: realBoot, pid: process.pid, process_start_marker: realMarker || "start_x" },
    now: T0,
  });
  // deliver the capability to the child ONLY via inherited fd 3 (never argv/env)
  const broker = brokerStdio(root, sim.lease_id);
  let out;
  try {
    const res = spawnSync(process.execPath, [CHILD, root, "r4", realBoot, String(T0 + 1000)], {
      stdio: ["ignore", "pipe", "pipe", broker.stdio[3]], encoding: "utf8",
    });
    assert.equal(res.status, 0, res.stderr);
    out = JSON.parse(res.stdout);
  } finally { closeBroker(broker); }
  assert.equal(out.gotCapViaFd, true, "child inherited the capability via fd");
  assert.equal(out.allowed, true, "authorized subprocess ALLOWED");
  // and even here, the capability never leaked onto the child's argv/env
  assert.equal(capabilityLeaks(sim.capability, { argv: out.argv, env: out.env }).leaked, false);
});

// Row 5 — same project, DIFFERENT run (no matching capability) -> REFUSE.
row(5, "same project, different run (no matching capability) => REFUSE", () => {
  const root = mkRoot("m5");
  const sim = simulateActiveOwnerLease(root, { owner_project: "akior", run_id: "the-soak", identity: fixedIdentity({ boot_id: BOOT }), now: T0 });
  const r = guardHeavyOp({ root, op: "build", requester: { run_id: "the-soak", capability: "w".repeat(64) }, currentBootId: BOOT, now: T0 + 1000, isAlive: ALIVE });
  assert.equal(r.allowed, false, "same run_id but WRONG capability still refused");
  assert.notEqual("w".repeat(64), sim.capability);
});

// Row 6 — two concurrent acquisitions -> exactly one winner.
row(6, "two concurrent acquisitions => exactly one winner", () => {
  const root = mkRoot("m6");
  const wins = [acquireLock(root), acquireLock(root), acquireLock(root), acquireLock(root)];
  assert.equal(wins.filter(Boolean).length, 1, "exactly one winner");
});

// Row 7 — stale heartbeat -> RECOVERY_REQUIRED, not allow.
row(7, "stale heartbeat => RECOVERY_REQUIRED (not allow)", () => {
  const root = mkRoot("m7");
  simulateActiveOwnerLease(root, { owner_project: "akior", identity: fixedIdentity({ boot_id: BOOT }), heartbeat_interval_s: 30, now: T0 });
  const now = T0 + 200 * 1000; // > 3*30s past the beat
  const r = guardHeavyOp({ root, op: "build", requester: null, currentBootId: BOOT, now, isAlive: ALIVE });
  assert.equal(r.allowed, false);
  assert.equal(r.effective, EFFECTIVE.RECOVERY_REQUIRED);
  const d = deriveDecision({ lockPresent: true, lease: readLease(root), heartbeat: readHeartbeat(root), currentBootId: BOOT, now, isAlive: ALIVE });
  assert.equal(d.recoveryReason, RECOVERY_REASON.STALE_HEARTBEAT);
});

// Row 8 — expiry alone -> does NOT unlock.
row(8, "expiry alone => does NOT unlock (RECOVERY_REQUIRED)", () => {
  const root = mkRoot("m8");
  // large heartbeat interval so ONLY expiry (not staleness) fires
  simulateActiveOwnerLease(root, { owner_project: "akior", identity: fixedIdentity({ boot_id: BOOT }), heartbeat_interval_s: 3600, lease_ttl_s: 60, now: T0 });
  const now = T0 + 120 * 1000; // past the 60s TTL, but not stale (interval 3600s)
  const r = guardHeavyOp({ root, op: "build", requester: null, currentBootId: BOOT, now, isAlive: ALIVE });
  assert.equal(r.allowed, false, "expiry does not free the host");
  const d = deriveDecision({ lockPresent: true, lease: readLease(root), heartbeat: readHeartbeat(root), currentBootId: BOOT, now, isAlive: ALIVE });
  assert.equal(d.recoveryReason, RECOVERY_REASON.EXPIRED);
});

// Row 9 — PID reuse (live pid, WRONG start-marker) -> does NOT authorize.
row(9, "PID reuse (live pid, wrong start-marker) => does NOT authorize", () => {
  const root = mkRoot("m9");
  const realBoot = bootId({ env: {} });
  // owner_pid is THIS live process, but the recorded start-marker is WRONG -> a reused pid.
  simulateActiveOwnerLease(root, {
    owner_project: "akior",
    identity: { host_id: "host_x", boot_id: realBoot, pid: process.pid, process_start_marker: "start_WRONG_INSTANCE" },
    now: T0,
  });
  // use the REAL liveness check: live pid + wrong marker => not the owner => recovery.
  const r = guardHeavyOp({ root, op: "build", requester: null, currentBootId: realBoot, now: T0 + 1000, isAlive: isProcessAlive });
  assert.equal(r.allowed, false);
  assert.equal(r.effective, EFFECTIVE.RECOVERY_REQUIRED);
});

// Row 10 — prior-boot lease -> enter recovery, not silent trust.
row(10, "prior-boot lease => recovery (not silent trust)", () => {
  const root = mkRoot("m10");
  simulateActiveOwnerLease(root, { owner_project: "akior", identity: fixedIdentity({ boot_id: "boot_PRIOR" }), now: T0 });
  const r = guardHeavyOp({ root, op: "build", requester: null, currentBootId: "boot_CURRENT", now: T0 + 1000, isAlive: ALIVE });
  assert.equal(r.allowed, false);
  const d = deriveDecision({ lockPresent: true, lease: readLease(root), heartbeat: readHeartbeat(root), currentBootId: "boot_CURRENT", now: T0 + 1000, isAlive: ALIVE });
  assert.equal(d.recoveryReason, RECOVERY_REASON.BOOT_MISMATCH);
});

// Row 11 — old owner tries to delete successor's lease -> refuse to delete.
row(11, "old owner deletes successor's lease => refuse to delete", () => {
  const root = mkRoot("m11");
  const h1 = launchSoak({ root, owner_project: "akior", run_id: "r1", identity: fixedIdentity(), now: T0, preflight: () => ({ quiet: true }), isAlive: ALIVE });
  const oldLeaseId = h1.lease_id;
  h1.release({ now: T0 + 10 });
  const h2 = launchSoak({ root, owner_project: "akior", run_id: "r2", identity: fixedIdentity({ pid: 777 }), now: T0 + 20, preflight: () => ({ quiet: true }), isAlive: ALIVE });
  const attempt = releaseByLeaseId(root, oldLeaseId, { now: T0 + 30 });
  assert.equal(attempt.ok, false);
  assert.equal(attempt.reason, "LEASE_ID_MISMATCH_REFUSE_DELETE");
  assert.equal(lockHeld(root), true);
  assert.equal(readLease(root).parsed.lease_id, h2.lease_id, "successor lease intact");
});

// Row 12 — manual override during an ACTIVE qualifying soak -> explicit + append-only event +
// entered into attestation; permanently removes QUIET_HOST eligibility (never auto-restored).
row(12, "override during ACTIVE soak => event + attestation + PERMANENT QUIET_HOST disqualification", () => {
  const root = mkRoot("m12");
  simulateActiveOwnerLease(root, { owner_project: "akior", run_id: "runQ", identity: fixedIdentity({ boot_id: BOOT }), now: T0 });
  assert.equal(isQuietHostEligible(root, "runQ"), true);
  const r = guardHeavyOp({ root, op: "build", requester: null, currentBootId: BOOT, now: T0 + 1000, isAlive: ALIVE, override: { founder: true } });
  assert.equal(r.allowed, true, "explicit override permits");
  assert.equal(isQuietHostEligible(root, "runQ"), false, "QUIET_HOST permanently removed");
  const ov = readEvents(root).filter((e) => e.kind === "OVERRIDE");
  assert.equal(ov.length, 1, "append-only override event");
  assert.equal(ov[0].never_auto_restored, true);
  // never auto-restored: re-checking never re-grants
  assert.equal(isQuietHostEligible(root, "runQ"), false);
});

// Row 13 — plain-English refusal message understandable to a non-developer.
row(13, "plain-English refusal understandable to a non-developer", () => {
  const root = mkRoot("m13");
  simulateActiveOwnerLease(root, { owner_project: "akior", identity: fixedIdentity({ boot_id: BOOT }), now: T0 });
  const r = guardHeavyOp({ root, op: "build", requester: null, currentBootId: BOOT, now: T0 + 1000, isAlive: ALIVE, expectedFinish: "5:00 PM" });
  const m = r.message;
  assert.ok(/owns this Mac/.test(m) && /paused/.test(m) && /Advisor chat/.test(m) && m.includes("5:00 PM"));
  for (const jargon of ["lease_id", "capability", "pid", "boot_id", "O_EXCL", "RECOVERY_REQUIRED"]) {
    assert.ok(!m.includes(jargon), `message must not contain jargon: ${jargon}`);
  }
});

// Row 14 — same-project build inherits the soak capability: MUST NOT inherit; no leak.
row(14, "same-project build must NOT inherit capability; capability never leaks (argv/env)", () => {
  const root = mkRoot("m14");
  const realBoot = bootId({ env: {} });
  const realMarker = processStartMarker(process.pid);
  const sim = simulateActiveOwnerLease(root, {
    owner_project: "akior", run_id: "the-soak",
    identity: { host_id: "host_x", boot_id: realBoot, pid: process.pid, process_start_marker: realMarker || "start_x" },
    now: T0,
  });
  // spawn a SAME-PROJECT (akior) build WITHOUT the capability fd -> it cannot inherit.
  const res = spawnSync(process.execPath, [CHILD, root, "the-soak", realBoot, String(T0 + 1000)], {
    stdio: ["ignore", "pipe", "pipe"], encoding: "utf8", // no fd 3 => no inheritance
  });
  assert.equal(res.status, 0, res.stderr);
  const out = JSON.parse(res.stdout);
  assert.equal(out.gotCapViaFd, false, "same-project build did NOT inherit the capability");
  assert.equal(out.allowed, false, "and is therefore REFUSED");
  // capability never leaked onto the child's argv/env
  const leak = capabilityLeaks(sim.capability, { argv: out.argv, env: out.env });
  assert.equal(leak.leaked, false, "capability absent from argv/env: " + JSON.stringify(leak.surfaces));
});

console.log(`\nSHWL-CROSS-PROJECT-MATRIX-SELFTEST: ALL ${pass}/14 ROWS GREEN`);
assert.equal(pass, 14, "all 14 rows must be green");
process.exit(0);
