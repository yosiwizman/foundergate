// FounderGate — VB1 SOAK DRIVER self-test (proofs; NO real soak, NO real ~/.cldh, NO caffeinate).
//
// Authority:
//   - Archived run-1 driver: docs/assembly-evidence/VB1/soak/run-2026-07-14/soak-driver.mjs
//       @ af56552746f2ab9958183de814af4d13c5f5aab1
//   - SHWL: docs/lanes/shared-host-workload-lease.md @ 6a4488d8ba728f203e83d0bf0d2ee48c684134af
//       (§4 lifecycle, §5.1 permanent QUIET_HOST downgrade, §8/§10 monitor)
//   - Honest-Duration & Soak-Proof Law: docs/ASSEMBLY_MANUAL.md §29 (five evidence elements)
//
// HARD RULE: every root here is a throwaway OS-temp dir; the real ~/.cldh is never read or written.
// No caffeinate process is ever spawned (its presence is SIMULATED as `ps` DATA rows).

import assert from "node:assert/strict";
import { mkdtempSync, rmSync, existsSync, mkdirSync, writeFileSync, readFileSync, statSync } from "node:fs";
import { tmpdir, homedir } from "node:os";
import { join } from "node:path";

import {
  validateOptions, parseArgs, scanHostRows, verifyCaffeine, recheckFreezeDrift,
  computeVerdict, acquireGuardedLease, makeEvidence, buildOwnTree, buildAncestors, SoakDriverError,
} from "./soak-driver.mjs";

// Accepted modules — IMPORTED, never modified.
import { buildFreezeManifest, enumerateFiles } from "../freeze-manifest/freeze-manifest.mjs";
import { launchSoak } from "../shwl/launcher.mjs";
import { readLease, readHeartbeat, writeLease, writeHeartbeat } from "../shwl/lease-store.mjs";
import { lockHeld, acquireLock } from "../shwl/lock.mjs";
import { newLeaseRecord } from "../shwl/schema.mjs";
import { STATUS } from "../shwl/constants.mjs";
import { createQuietHostMonitor, DETECTION } from "../quiet-host-monitor/monitor.mjs";
import { isQuietHostEligible } from "../shwl/attestation.mjs";
import { newSoak, addWindow, slo, passed } from "./reliability-soak.mjs";

const FAKE_SHA = "0123456789abcdef0123456789abcdef01234567"; // 40-hex, valid shape, temp-only DATA
const T0 = Date.parse("2026-07-14T12:00:00Z");
const roots = [];

function mkRoot(tag = "soakdrv") {
  const r = mkdtempSync(join(tmpdir(), `${tag}-`));
  const forbidden = join(homedir(), ".cldh");
  if (r === forbidden || r.startsWith(forbidden)) throw new Error(`REFUSED: test tried to use real home lease dir: ${r}`);
  if (!r.startsWith(tmpdir())) throw new Error(`REFUSED: test root not under OS temp: ${r}`);
  roots.push(r);
  return r;
}
function cleanup() { for (const r of roots.splice(0)) { try { if (existsSync(r)) rmSync(r, { recursive: true, force: true }); } catch { /* best-effort */ } } }

// Tiny harness matching the repo's self-test style.
let pass = 0;
const title = "VB1 soak-driver harvest (parameterized, §29 AND-gate, run-1 lessons a/b/c/d)";
console.log(`== ${title} ==`);
const check = (name, fn) => { fn(); pass++; console.log(`  PASS: ${name}`); };

function baseOptions(over = {}) {
  return { sha: FAKE_SHA, claimHours: 8, evidenceDir: mkRoot("ev"), leasePurpose: "VB1 soak (test)", repo: "/tmp/repo", leaseTtlSeconds: 10 * 3600, ...over };
}
function fakeCaffeine(held) { return { held, holders: held ? [{ pid: 90, cmd: "caffeinate -dimsu node soak-driver.mjs", via: "ancestor" }] : [], checked_pids: 3 }; }

// A temp repo with the real frozen scope (src/ + scripts/ + package.json) so freeze functions run.
function seedRepo() {
  const repo = mkRoot("repo");
  mkdirSync(join(repo, "src"), { recursive: true });
  mkdirSync(join(repo, "scripts"), { recursive: true });
  writeFileSync(join(repo, "src", "a.mjs"), "export const a = 1;\n");
  writeFileSync(join(repo, "scripts", "b.mjs"), "console.log('b');\n");
  writeFileSync(join(repo, "package.json"), JSON.stringify({ name: "frozen", version: "0.0.0" }, null, 2) + "\n");
  return repo;
}

// A schema-valid ACTIVE lease + heartbeat via the ACCEPTED store (imported, not reimplemented).
function seedActiveLease(root, { run_id, now = T0, heartbeat_at } = {}) {
  acquireLock(root);
  const acquired_at = new Date(now).toISOString();
  const lease_id = ("lease_" + run_id).slice(0, 64);
  const beat = heartbeat_at ?? acquired_at;
  let lease = newLeaseRecord({
    lease_id, owner_project: "foundergate", run_id, lease_capability_id: "capability_test_0123456789abcdefghij",
    identity: { host_id: "host_TEST", boot_id: "boot_TEST_1", pid: 424242, process_start_marker: "start_TEST" },
    acquired_at, heartbeat_interval_s: 30, lease_ttl_s: 3600,
  });
  lease = { ...lease, status: STATUS.ACTIVE, activated_at: acquired_at, heartbeat_at: beat };
  writeLease(root, lease);
  writeHeartbeat(root, { lease_id, heartbeat_at: beat });
  return { lease_id };
}

// =================================================================================================
// PROOF 1 — parameter validation (no hardcoding; every param injectable + validated)
// =================================================================================================
check("validateOptions accepts a well-formed options object and normalizes defaults", () => {
  const o = validateOptions(baseOptions());
  assert.equal(o.sha, FAKE_SHA);
  assert.equal(o.claimHours, 8);
  assert.equal(o.leaseTtlSeconds, 36000);
  assert.equal(o.sloTarget, 0.99);       // default
  assert.equal(o.probe, "npm test");     // default
  assert.equal(o.hostId, "qual-host");   // default
});

check("validateOptions REJECTS a non-40-hex / short / phantom SHA", () => {
  assert.throws(() => validateOptions(baseOptions({ sha: "c22b86a2" })), /sha.*40-char/);
  assert.throws(() => validateOptions(baseOptions({ sha: "ZZZ" })), /sha.*40-char/);
});

check("validateOptions REJECTS a TTL that does not EXCEED the claimed span (run-1 lesson b)", () => {
  // 8h span = 28800s; a 6h (21600s) TTL would expire mid-run.
  assert.throws(() => validateOptions(baseOptions({ leaseTtlSeconds: 21600 })), /must EXCEED the claimed span/);
  // exactly-equal is also refused (must strictly exceed).
  assert.throws(() => validateOptions(baseOptions({ leaseTtlSeconds: 28800 })), /must EXCEED the claimed span/);
});

check("validateOptions collects EVERY missing/invalid param and reports them together", () => {
  try { validateOptions({ claimHours: -1, sloTarget: 2 }); assert.fail("should have thrown"); }
  catch (e) {
    assert.ok(e instanceof SoakDriverError);
    assert.match(e.message, /sha/);
    assert.match(e.message, /claimHours/);
    assert.match(e.message, /evidenceDir/);
    assert.match(e.message, /leasePurpose/);
    assert.match(e.message, /sloTarget/);
  }
});

check("parseArgs maps CLI flags to validated options (nothing hardcoded)", () => {
  const ev = mkRoot("ev");
  const o = parseArgs(["node", "soak-driver.mjs", "--sha", FAKE_SHA, "--claim", "24", "--evidence", ev, "--purpose", "VB1 24h qualifying soak", "--ttl", "90000", "--repo", "/tmp/repo"]);
  assert.equal(o.claimHours, 24);
  assert.equal(o.leaseTtlSeconds, 90000);
  assert.equal(o.leasePurpose, "VB1 24h qualifying soak");
});

// =================================================================================================
// PROOF 2 — freeze-scope drift recheck by manifest_hash detects a MUTATED frozen file (lesson a)
// =================================================================================================
check("recheckFreezeDrift: NO DRIFT when frozen bytes are unchanged (manifest_hash matches)", () => {
  const repo = seedRepo();
  const scope = [...enumerateFiles(join(repo, "src")).map((p) => join("src", p)), ...enumerateFiles(join(repo, "scripts")).map((p) => join("scripts", p)), "package.json"];
  const baseline = buildFreezeManifest({ root: repo, paths: scope, gitSha: FAKE_SHA, now: "t0" });
  const res = recheckFreezeDrift({ repo, sha: FAKE_SHA, baselineManifestHash: baseline.manifest_hash, baselineEntries: baseline.entries, enumerateFiles, buildFreezeManifest, gitHead: () => FAKE_SHA, now: "t1" });
  assert.equal(res.ok, true, "unchanged code re-frozen later yields an identical manifest_hash");
});

check("recheckFreezeDrift: DETECTS a mutated frozen file (CONTENT_CHANGED, verdict-honest)", () => {
  const repo = seedRepo();
  const scope = [...enumerateFiles(join(repo, "src")).map((p) => join("src", p)), ...enumerateFiles(join(repo, "scripts")).map((p) => join("scripts", p)), "package.json"];
  const baseline = buildFreezeManifest({ root: repo, paths: scope, gitSha: FAKE_SHA, now: "t0" });
  writeFileSync(join(repo, "src", "a.mjs"), "export const a = 999; // TAMPERED mid-run\n");
  const res = recheckFreezeDrift({ repo, sha: FAKE_SHA, baselineManifestHash: baseline.manifest_hash, baselineEntries: baseline.entries, enumerateFiles, buildFreezeManifest, gitHead: () => FAKE_SHA, now: "t1" });
  assert.equal(res.ok, false);
  assert.ok(res.drift.some((d) => d.path === "src/a.mjs" && d.reason === "CONTENT_CHANGED"));
});

check("recheckFreezeDrift: git HEAD moving mid-run is a fail-closed drift", () => {
  const repo = seedRepo();
  const scope = [...enumerateFiles(join(repo, "src")).map((p) => join("src", p)), ...enumerateFiles(join(repo, "scripts")).map((p) => join("scripts", p)), "package.json"];
  const baseline = buildFreezeManifest({ root: repo, paths: scope, gitSha: FAKE_SHA, now: "t0" });
  const res = recheckFreezeDrift({ repo, sha: FAKE_SHA, baselineManifestHash: baseline.manifest_hash, baselineEntries: baseline.entries, enumerateFiles, buildFreezeManifest, gitHead: () => "ffffffffffffffffffffffffffffffffffffffff", now: "t1" });
  assert.equal(res.ok, false);
  assert.match(res.error, /git HEAD moved/);
});

// =================================================================================================
// PROOF 3 — process matcher EXCLUDES self/ancestors yet STILL flags a real second soak (lesson c)
// =================================================================================================
check("scanHostRows: excludes self + descendants + ancestors (incl. an ancestor whose argv names a soak file), yet flags a genuine second soak AND a heavy foreign workload", () => {
  const selfPid = 100;
  const rows = [
    { pid: 80, ppid: 1, pcpu: 0.1, cmd: "/bin/zsh -l" },                                   // grandparent shell (ancestor)
    { pid: 90, ppid: 80, pcpu: 0.0, cmd: "caffeinate -dimsu node src/tools/soak-driver.mjs --claim 24" }, // caffeinate wrapper (ancestor); argv NAMES a soak file
    { pid: 100, ppid: 90, pcpu: 5.0, cmd: "node src/tools/soak-driver.mjs" },              // SELF
    { pid: 110, ppid: 100, pcpu: 3.0, cmd: "node src/tools/soak-run.mjs --claim 24" },     // our OWN soak child (descendant)
    { pid: 200, ppid: 1, pcpu: 1.0, cmd: "node /elsewhere/soak-run.mjs --claim 8" },       // GENUINE unrelated SECOND SOAK
    { pid: 300, ppid: 1, pcpu: 55.0, cmd: "vite build --mode production" },                // heavy foreign workload
    { pid: 400, ppid: 1, pcpu: 90.0, cmd: "/bin/sh -c 'node soak-run.mjs'" },              // sh -c wrapper: argv is text, not work
    { pid: 500, ppid: 1, pcpu: 2.0, cmd: "vite preview" },                                 // heavy sig but below CPU threshold -> not flagged
  ];
  const s = scanHostRows({ rows, loadavg: 1.0, ncpu: 8, selfPid });
  const flagged = new Set(s.foreignHeavy.map((f) => f.pid));
  // Excluded: self(100), our child(110), ancestors(80,90), shell-wrapper(400), sub-threshold(500).
  for (const pid of [80, 90, 100, 110, 400, 500]) assert.ok(!flagged.has(pid), `pid ${pid} must NOT be flagged`);
  // Flagged: the genuine second soak (200) and the heavy foreign build (300).
  assert.ok(flagged.has(200), "a genuine unrelated second soak must be flagged");
  assert.ok(flagged.has(300), "a heavy foreign workload must be flagged");
  assert.equal(s.foreignHeavy.find((f) => f.pid === 200).second_soak, true);
  assert.equal(s.foreignHeavy.find((f) => f.pid === 300).second_soak, false);
  // ancestor-exclusion sanity: the caffeinate wrapper (90) and the launching shell (80) are ancestors.
  const anc = buildAncestors(rows, selfPid);
  assert.ok(anc.has(80) && anc.has(90), "the launcher/caffeinate wrapper must be recognized as ancestors");
  assert.ok(buildOwnTree(rows, selfPid).has(110), "our own soak child must be recognized as a descendant");
});

// =================================================================================================
// CAFFEINATE — verify-and-record (read-only); ancestor-held assertion honored
// =================================================================================================
check("verifyCaffeine: detects an ancestor-held `caffeinate -dimsu` assertion over the driver tree", () => {
  const rows = [
    { pid: 90, ppid: 1, pcpu: 0.0, cmd: "caffeinate -dimsu node soak-driver.mjs" },
    { pid: 100, ppid: 90, pcpu: 5.0, cmd: "node soak-driver.mjs" },
  ];
  const c = verifyCaffeine({ rows, selfPid: 100 });
  assert.equal(c.held, true);
  assert.equal(c.holders[0].via, "ancestor");
});
check("verifyCaffeine: reports NOT held when no caffeinate process is in the tree", () => {
  const rows = [{ pid: 90, ppid: 1, pcpu: 0, cmd: "/bin/zsh" }, { pid: 100, ppid: 90, pcpu: 5, cmd: "node soak-driver.mjs" }];
  assert.equal(verifyCaffeine({ rows, selfPid: 100 }).held, false);
});

// =================================================================================================
// PROOF 4 — refusal -> clean lease release (no orphaned lock) [lesson d]; caffeinate fail-closed
// =================================================================================================
check("acquireGuardedLease: caffeinate NOT held -> fail-closed refusal BEFORE acquisition (no lock ever taken)", () => {
  const root = mkRoot("lease");
  const ev = makeEvidence(mkRoot("ev"));
  const r = acquireGuardedLease({ root, options: validateOptions(baseOptions()), caffeine: fakeCaffeine(false), preflight: () => ({ quiet: true }), launchSoak, evidence: ev, now: () => T0 });
  assert.equal(r.acquired, false);
  assert.equal(r.reason, "CAFFEINATE_NOT_HELD");
  assert.equal(lockHeld(root), false, "no lock may be orphaned when we refuse before acquiring");
  assert.ok(existsSync(join(ev.dir, "REFUSAL.json")));
});

check("acquireGuardedLease: preflight NOT quiet -> reservation RELEASED cleanly, NO orphaned lock (lesson d)", () => {
  const root = mkRoot("lease");
  const ev = makeEvidence(mkRoot("ev"));
  const r = acquireGuardedLease({ root, options: validateOptions(baseOptions()), caffeine: fakeCaffeine(true), preflight: () => ({ quiet: false, reason: "foreign heavy workload present" }), launchSoak, evidence: ev, now: () => T0 });
  assert.equal(r.acquired, false);
  assert.match(r.reason, /preflight FAILED/);
  assert.equal(lockHeld(root), false, "the SHWL launcher must release the reservation on PREFLIGHT_FAIL — no orphan lock");
  const lease = readLease(root);
  assert.equal(lease.parsed.status, STATUS.RELEASED);
  assert.ok(existsSync(join(ev.dir, "REFUSAL.json")));
});

// =================================================================================================
// PROOF 5 — explicit TTL honored on the real lease acquisition
// =================================================================================================
check("acquireGuardedLease: the EXPLICIT TTL parameter lands on the acquired lease record", () => {
  const root = mkRoot("lease");
  const ev = makeEvidence(mkRoot("ev"));
  const options = validateOptions(baseOptions({ claimHours: 24, leaseTtlSeconds: 90000 })); // TTL > 24h span
  const r = acquireGuardedLease({ root, options, caffeine: fakeCaffeine(true), preflight: () => ({ quiet: true }), launchSoak, evidence: ev, now: () => T0 });
  assert.equal(r.acquired, true);
  const lease = readLease(root);
  assert.equal(lease.parsed.lease_ttl_s, 90000, "the injected TTL must be the lease's TTL (not the SHWL 6h default)");
  assert.equal(lease.parsed.status, STATUS.ACTIVE);
  r.handle.release({ reason: "TEST_DONE" }); // clean up the temp lease
  assert.equal(lockHeld(root), false);
});

// =================================================================================================
// PROOF 6 (CRITICAL) — quiet-host detector STILL fires: stale heartbeat -> permanent §5.1 QUIET_HOST
//                       downgrade -> computeVerdict = NOT-PASSED (never massaged)
// =================================================================================================
check("stale heartbeat -> §5.1 QUIET_HOST permanent downgrade -> verdict NOT-PASSED (even with a passing accumulator)", () => {
  const root = mkRoot("lease");
  const run_id = "run_soak_quiet_test";
  const { } = seedActiveLease(root, { run_id, now: T0, heartbeat_at: new Date(T0).toISOString() });
  const monitor = createQuietHostMonitor({ root, run_id, run_started_at: T0 });
  assert.equal(monitor.eligibleNow(), true, "a fresh run starts QUIET_HOST eligible");

  // Observe the host 200s later with the last beat at T0 -> stale (> 3 * 30s window) -> downgrade.
  const at = T0 + 200_000;
  const obs = monitor.observeHostState({ at, lease: readLease(root), heartbeat: readHeartbeat(root), currentBootId: "boot_TEST_1", isAlive: () => true });
  assert.equal(obs.quiet, false);
  assert.equal(obs.detection.kind, DETECTION.MISSING_HEARTBEAT);
  assert.equal(isQuietHostEligible(root, run_id), false, "the §5.1 downgrade is permanent and reconstructable");

  const snap = monitor.snapshot();
  const quietEligible = monitor.eligibleNow() && snap.quiet_host_downgraded === false;
  assert.equal(quietEligible, false);

  // Build a soak state that GENUINELY passes duration + SLO, to prove the QUIET_HOST gate alone flips
  // the verdict to NOT-PASSED (the AND-gate cannot be massaged by a clean accumulator).
  const soak = newSoak(8);
  addWindow(soak, { ts: "2026-07-14T12:00:00Z", ok: 1, fail: 0 });
  addWindow(soak, { ts: "2026-07-14T20:30:00Z", ok: 1, fail: 0 }); // 8.5h span, 100% avail
  assert.equal(passed(soak), true, "the accumulator alone would PASS");

  const options = validateOptions(baseOptions());
  const verdict = computeVerdict({
    options, slo: slo(soak), accumulatorPassed: passed(soak), quietEligible, drift: { ok: true },
    soakState: soak, ids: { lease_id: "lease_x", run_id }, caffeine: fakeCaffeine(true),
  });
  assert.equal(verdict.isPass, false, "QUIET_HOST loss forces NOT-PASSED despite a passing accumulator");
  assert.match(verdict.verdictLine, /NOT-PASSED/);
  assert.ok(verdict.reasons.some((r) => /QUIET_HOST/.test(r)));
});

check("scanHostRows second-soak sighting drives the REAL monitor to a permanent §5.1 downgrade", () => {
  const root = mkRoot("lease");
  const run_id = "run_soak_second";
  seedActiveLease(root, { run_id, now: T0 });
  const monitor = createQuietHostMonitor({ root, run_id, run_started_at: T0 });
  const rows = [
    { pid: 100, ppid: 90, pcpu: 4, cmd: "node soak-driver.mjs" },              // self
    { pid: 200, ppid: 1, pcpu: 1, cmd: "node /elsewhere/soak-run.mjs" },       // genuine second soak
  ];
  const s = scanHostRows({ rows, loadavg: 1, ncpu: 8, selfPid: 100 });
  assert.equal(s.foreignHeavy.length, 1);
  const r = monitor.prohibitedWorkloadAppeared({ at: T0 + 60_000, op: "soak", detail: s.foreignHeavy[0], foreign: true });
  assert.equal(r.downgraded, true);
  assert.equal(isQuietHostEligible(root, run_id), false);
});

// =================================================================================================
// §29 — all FIVE evidence elements present for EITHER verdict (PASS and NOT-PASSED)
// =================================================================================================
check("computeVerdict emits all five §29 elements for BOTH a PASS and a NOT-PASSED verdict", () => {
  const options = validateOptions(baseOptions());
  const soak = newSoak(8);
  addWindow(soak, { ts: "2026-07-14T12:00:00Z", ok: 1, fail: 0 });
  addWindow(soak, { ts: "2026-07-14T20:30:00Z", ok: 1, fail: 0 });
  const mkVerdict = (quietEligible) => computeVerdict({ options, slo: slo(soak), accumulatorPassed: passed(soak), quietEligible, drift: { ok: true }, soakState: soak, ids: { lease_id: "L", run_id: "R" }, caffeine: fakeCaffeine(true) });
  for (const [label, v] of [["PASS", mkVerdict(true)], ["NOT-PASSED", mkVerdict(false)]]) {
    const txt = v.text;
    assert.match(txt, label === "PASS" ? /SOAK PASS/ : /SOAK — NOT-PASSED/, `(1) named line for ${label}`);
    assert.match(txt, /start: 2026-07-14T12:00:00Z/, `(2) start timestamp for ${label}`);
    assert.match(txt, /end: 2026-07-14T20:30:00Z/, `(2) end timestamp for ${label}`);
    assert.match(txt, new RegExp(`SHA under test: ${FAKE_SHA}`), `(3) exact SHA for ${label}`);
    assert.match(txt, /monitoring evidence:/, `(4) monitoring evidence ref for ${label}`);
    assert.match(txt, /failures & interventions log:/, `(5) failures/interventions ref for ${label}`);
  }
});

// =================================================================================================
// SD-1 — the interventions log OPENS at run start with one sentinel line, so a ZERO-intervention run
// still yields a non-empty, manifest-consistent intervention-log.jsonl (evidence-integrity guard
// rejects 0-byte evidence). Found by independent verification of the run-2 PASS bundle.
// =================================================================================================
const INTERV = (dir) => join(dir, "intervention-log.jsonl");

check("SD-1: openInterventionLog writes a NON-EMPTY sentinel-only log at run start (zero interventions); satisfies the guard's 0-byte gate", () => {
  const dir = mkRoot("ev-sd1");
  const ev = makeEvidence(dir);
  ev.openInterventionLog("run_abc123");
  // (a) exists + non-empty — EXACTLY the evidence-integrity guard's rejection criterion (st.size === 0).
  assert.ok(existsSync(INTERV(dir)), "intervention-log.jsonl must exist after openInterventionLog");
  assert.ok(statSync(INTERV(dir)).size > 0, "must be NON-EMPTY — the guard rejects any 0-byte evidence file");
  // (b) sentinel-only => zero interventions: exactly one line; type=log-opened; carries run_id; NO `kind`.
  const recs = readFileSync(INTERV(dir), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  assert.equal(recs.length, 1, "sentinel-only file = exactly one JSONL line");
  assert.equal(recs[0].type, "log-opened", "sentinel carries type=log-opened");
  assert.equal(recs[0].run_id, "run_abc123", "sentinel carries the real run_id");
  assert.ok(typeof recs[0].ts === "string" && recs[0].ts.length > 0, "sentinel carries a real ISO timestamp");
  assert.ok(!("kind" in recs[0]), "sentinel must NOT carry a `kind` — it is NOT an intervention");
  assert.equal(recs.filter((r) => "kind" in r).length, 0, "sentinel-only => ZERO interventions (counted by `kind`)");
});

check("SD-1: a real intervention appends AFTER the sentinel and is counted; the sentinel is never displaced or counted", () => {
  const dir = mkRoot("ev-sd1b");
  const ev = makeEvidence(dir);
  ev.openInterventionLog("run_xyz");
  ev.intervention("QUIET_HOST_VIOLATION_STATE", { effective: "DEGRADED" });
  const recs = readFileSync(INTERV(dir), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  assert.equal(recs.length, 2, "sentinel + one intervention = two lines (append-only; nothing displaced)");
  assert.equal(recs[0].type, "log-opened", "sentinel stays FIRST — a real record cannot mask/displace it");
  assert.equal(recs[1].kind, "QUIET_HOST_VIOLATION_STATE", "the real intervention appends AFTER the sentinel");
  assert.equal(recs.filter((r) => "kind" in r).length, 1, "exactly ONE intervention counted (the sentinel is not counted)");
});

check("SD-1: openInterventionLog is idempotent — repeat calls never write a second sentinel (no 0-byte, no duplicate)", () => {
  const dir = mkRoot("ev-sd1c");
  const ev = makeEvidence(dir);
  ev.openInterventionLog("run_1");
  ev.openInterventionLog("run_1");     // no-op
  ev.openInterventionLog("run_2");     // still a no-op — the log is opened exactly once
  const recs = readFileSync(INTERV(dir), "utf8").split("\n").filter(Boolean);
  assert.equal(recs.length, 1, "at most one sentinel is ever written");
});

check("SD-1: refusal/early paths never emit a sentinel but are still NON-EMPTY (a real intervention keeps the log > 0 bytes)", () => {
  // Mirrors the acquireGuardedLease refusal path: intervention() is called WITHOUT openInterventionLog.
  const dir = mkRoot("ev-sd1d");
  const ev = makeEvidence(dir);
  ev.intervention("CAFFEINATE_NOT_HELD", { holders: [] });
  assert.ok(statSync(INTERV(dir)).size > 0, "a refused run's log is non-empty via its refusal intervention (guard passes)");
  const recs = readFileSync(INTERV(dir), "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  assert.equal(recs.length, 1, "refusal log = the one refusal record (no sentinel, since the run never started)");
  assert.equal(recs[0].kind, "CAFFEINATE_NOT_HELD", "the refusal is honestly recorded as a real intervention");
});

cleanup();
console.log(`\n${title}: PASS (${pass} checks)`);
process.exit(0);
