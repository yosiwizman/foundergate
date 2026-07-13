// L4 — quiet-host continuous monitor self-test.
//
// Authority: docs/lanes/shared-host-workload-lease.md @ 6a4488d8ba728f203e83d0bf0d2ee48c684134af
// §8/§10 (continuous monitor — DETECTION) + §5.1 (permanent QUIET_HOST downgrade, reconstructable
// from events.log, NEVER auto-restored). Proves detection via the REAL §5.1 attestation and that
// this monitor exposes NO process-control surface.

import assert from "node:assert/strict";
import { readFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";

import * as monMod from "./monitor.mjs";
import { createQuietHostMonitor, DETECTION } from "./monitor.mjs";
import { isQuietHostEligible, loadAttestation } from "../shwl/attestation.mjs";
import { readEvents } from "../shwl/lease-store.mjs";
import { readLease, readHeartbeat } from "../shwl/lease-store.mjs";
import { mkRoot, seedActiveLease, harness, T0, fixedIdentity } from "./_kit.mjs";

const t = harness("L4 quiet-host continuous monitor (§8/§10 + §5.1)");

// ---------------------------------------------------------------------------------------------
// 1) PROHIBITED WORKLOAD AFTER START -> interval recorded + PERMANENT §5.1 disqualification,
//    verified by reading it back — INCLUDING after DELETING the attestation file (events.log wins).
// ---------------------------------------------------------------------------------------------
t.check("prohibited-workload-after-start: EXACT interval recorded + QUIET_HOST permanently disqualified (REAL §5.1)", () => {
  const root = mkRoot("qhm");
  const run_id = "run_soak_prohibited";
  const m = createQuietHostMonitor({ root, run_id, run_started_at: T0 });

  assert.equal(m.eligibleNow(), true, "a fresh run starts QUIET_HOST eligible");

  const from = T0 + 60_000;   // a foreign build appears 60s after the run began
  const to = T0 + 120_000;    // and clears 60s later
  const r = m.prohibitedWorkloadAppeared({ at: from, op: "build", detail: "foreign build seen by monitor" });
  assert.equal(r.downgraded, true);
  assert.equal(r.kind, DETECTION.PROHIBITED_WORKLOAD);
  m.prohibitedWorkloadCleared({ at: to, op: "build" });

  // EXACT interval recorded in the monitor snapshot.
  const snap = m.snapshot();
  assert.equal(snap.episodes.length, 1);
  assert.equal(snap.episodes[0].kind, DETECTION.PROHIBITED_WORKLOAD);
  assert.equal(snap.episodes[0].from, new Date(from).toISOString());
  assert.equal(snap.episodes[0].to, new Date(to).toISOString(), "exact END recorded on clear");
  assert.equal(snap.quiet_host_downgraded, true);

  // PERMANENT §5.1 disqualification via the REAL attestation — read it back.
  assert.equal(m.eligibleNow(), false);
  assert.equal(isQuietHostEligible(root, run_id), false);
  const att = loadAttestation(root, run_id);
  assert.equal(att.quiet_host_eligible, false);
  assert.ok(att.override_intervals.length >= 1, "override interval entered into the run attestation");
  assert.equal(att.never_auto_restored, true);

  // Append-only OVERRIDE event with the permanent-disqualification consequence.
  const overrides = readEvents(root).filter((e) => e.kind === "OVERRIDE");
  assert.ok(overrides.length >= 1);
  assert.equal(overrides[0].consequence, "QUIET_HOST_PERMANENTLY_DISQUALIFIED");
  assert.equal(overrides[0].never_auto_restored, true);

  // DELETE the attestation file — eligibility must STAY disqualified (reconstructed from events.log).
  const attFile = join(root, "attestation", encodeURIComponent(run_id) + ".json");
  assert.ok(existsSync(attFile));
  rmSync(attFile, { force: true });
  assert.equal(isQuietHostEligible(root, run_id), false, "events.log reconstruction keeps it disqualified");
  assert.equal(m.eligibleNow(), false);
  assert.equal(loadAttestation(root, run_id).disqualified_reason, "RECONSTRUCTED_FROM_EVENTS_LOG");
});

// ---------------------------------------------------------------------------------------------
// 2) MISSING HEARTBEAT detected from an injected host-state snapshot (via the REAL §2 machine).
// ---------------------------------------------------------------------------------------------
t.check("missing-heartbeat detected from host-state snapshot -> downgraded", () => {
  const root = mkRoot("qhm");
  const run_id = "run_soak_stale";
  const id = fixedIdentity();
  seedActiveLease(root, { run_id, identity: id, now: T0, heartbeat_at: new Date(T0).toISOString() });
  const m = createQuietHostMonitor({ root, run_id, run_started_at: T0 });

  const at = T0 + 200_000; // 200s > 3 * 30s stale window with the last beat at T0
  const res = m.observeHostState({
    at, lease: readLease(root), heartbeat: readHeartbeat(root),
    currentBootId: id.boot_id, isAlive: () => true, // owner "alive" but silent
  });
  assert.equal(res.quiet, false);
  assert.equal(res.detection.kind, DETECTION.MISSING_HEARTBEAT);
  assert.equal(isQuietHostEligible(root, run_id), false);
});

// ---------------------------------------------------------------------------------------------
// 3) OWNER-GONE detected from an injected host-state snapshot (owning process not alive).
// ---------------------------------------------------------------------------------------------
t.check("owner-process-gone detected from host-state snapshot -> downgraded", () => {
  const root = mkRoot("qhm");
  const run_id = "run_soak_ownergone";
  const id = fixedIdentity();
  seedActiveLease(root, { run_id, identity: id, now: T0, heartbeat_at: new Date(T0).toISOString() });
  const m = createQuietHostMonitor({ root, run_id, run_started_at: T0 });

  const res = m.observeHostState({
    at: T0 + 10_000, lease: readLease(root), heartbeat: readHeartbeat(root),
    currentBootId: id.boot_id, isAlive: () => false, // owning process disappeared
  });
  assert.equal(res.quiet, false);
  assert.equal(res.detection.kind, DETECTION.OWNER_GONE);
  assert.equal(isQuietHostEligible(root, run_id), false);
});

// ---------------------------------------------------------------------------------------------
// 4) MANUAL BYPASS and LEASE TAMPER (direct instantaneous detections) also downgrade.
// ---------------------------------------------------------------------------------------------
t.check("manual-bypass detection -> downgraded (permanent)", () => {
  const root = mkRoot("qhm");
  const run_id = "run_soak_bypass";
  const m = createQuietHostMonitor({ root, run_id, run_started_at: T0 });
  const r = m.manualBypassDetected({ at: T0 + 5_000, detail: "heavy work typed outside the harness" });
  assert.equal(r.downgraded, true);
  assert.equal(r.kind, DETECTION.MANUAL_BYPASS);
  assert.equal(isQuietHostEligible(root, run_id), false);
});

t.check("lease-tamper via a DIFFERENT run seizing the host mid-soak -> LEASE_TAMPERED downgrade", () => {
  const root = mkRoot("qhm");
  const run_id = "run_soak_ours";
  const id = fixedIdentity();
  // Another run now owns the host on disk; our requester presents no matching capability.
  seedActiveLease(root, { run_id: "run_intruder", identity: id, now: T0 });
  const m = createQuietHostMonitor({ root, run_id, run_started_at: T0 });
  const res = m.observeHostState({
    at: T0 + 1_000, lease: readLease(root), heartbeat: readHeartbeat(root),
    currentBootId: id.boot_id, isAlive: () => true, requester: null,
  });
  assert.equal(res.quiet, false);
  assert.equal(res.detection.kind, DETECTION.LEASE_TAMPERED);
  assert.equal(isQuietHostEligible(root, run_id), false);
});

// ---------------------------------------------------------------------------------------------
// 5) NEVER auto-restored — no restore/re-enable surface; repeat detection stays disqualified.
// ---------------------------------------------------------------------------------------------
t.check("NEVER auto-restored: repeat detections keep it disqualified; no restore surface exported", () => {
  const root = mkRoot("qhm");
  const run_id = "run_soak_repeat";
  const m = createQuietHostMonitor({ root, run_id, run_started_at: T0 });
  m.manualBypassDetected({ at: T0 + 1_000 });
  m.manualBypassDetected({ at: T0 + 2_000 });
  assert.equal(isQuietHostEligible(root, run_id), false);
  const suspicious = Object.keys(m).filter((k) => /restore|re-?enable|requalif|grant/i.test(k));
  assert.deepEqual(suspicious, [], "monitor exposes no re-grant of QUIET_HOST eligibility");
});

// ---------------------------------------------------------------------------------------------
// 6) NO process-kill / exec surface — neither in the instance, the module exports, nor the source.
// ---------------------------------------------------------------------------------------------
t.check("monitor exposes NO process-control surface (no kill/exec/spawn/terminate/signal)", () => {
  const m = createQuietHostMonitor({ root: mkRoot("qhm"), run_id: "run_surface", run_started_at: T0 });
  const surface = [
    ...Object.keys(m),
    ...Object.getOwnPropertyNames(Object.getPrototypeOf(m) || {}),
    ...Object.keys(monMod),
  ];
  const forbidden = /kill|exec|spawn|terminate|signal/i;
  for (const k of surface) assert.ok(!forbidden.test(k), `forbidden process-control name on surface: ${k}`);

  // The SOURCE must not import child_process nor call any process-control primitive.
  const src = readFileSync(new URL("./monitor.mjs", import.meta.url), "utf8");
  for (const bad of ["child_process", "process.kill", "execFileSync", "execSync", "spawnSync", "spawn(", ".exec("]) {
    assert.ok(!src.includes(bad), `monitor.mjs must not contain process-control primitive: ${bad}`);
  }
});

// ---------------------------------------------------------------------------------------------
// 7) Sightings STRICTLY BEFORE the run began are ignored (do not downgrade on pre-run noise).
// ---------------------------------------------------------------------------------------------
t.check("a sighting strictly before run start is ignored (no false downgrade)", () => {
  const root = mkRoot("qhm");
  const run_id = "run_soak_prerun";
  const m = createQuietHostMonitor({ root, run_id, run_started_at: T0 });
  const r = m.prohibitedWorkloadAppeared({ at: T0 - 5_000, op: "build" });
  assert.equal(r.downgraded, false);
  assert.equal(r.ignored, true);
  assert.equal(isQuietHostEligible(root, run_id), true, "pre-run noise never downgrades the run");
});

t.done("L4-QUIET-HOST-MONITOR-SELFTEST");
