// VB2 INTEGRATED SOAK — COMPRESSED-TIMESCALE REHEARSAL (§29 step 4). Two proofs, both required.
//
// PROOF 4a — the QUIET-HOST DETECTOR genuinely FIRES and records a permanent §5.1 downgrade:
//   * control  : a clean host snapshot -> scanHostRows finds NO foreign heavy work -> NO downgrade.
//   * foreign  : inject a FOREIGN heavy workload (a second soak + an xcodebuild at high %CPU) ->
//                the REAL scanHostRows flags it -> the REAL monitor.prohibitedWorkloadAppeared()
//                applies the REAL §5.1 downgrade -> eligibleNow() reads back INELIGIBLE.
//   * stale    : a simulated stale heartbeat -> the REAL deriveDecision raises RECOVERY_REQUIRED ->
//                monitor.observeHostState() downgrades (MISSING_HEARTBEAT) -> INELIGIBLE.
//
// PROOF 4b — the VB2 STORE is genuinely in the launch path:
//   * normal   : the integrated probe (VB1 launch -> write+read THROUGH the ClassifiedObjectStore)
//                exits 0.
//   * bypass   : the SAME probe with the store routed around (FG_STORE_BYPASS=1) exits NON-ZERO.
//                If bypassing the store still exited 0, the store is decorative -> HARD STOP.
//
// All modules are the ACCEPTED product modules, imported by absolute path. Uses the monitor's own
// _kit to seed lease roots under the OS temp dir (never the real ~/.cldh). No real soak, no caffeinate.

import { spawnSync } from "node:child_process";
import { pathToFileURL, fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { writeFileSync } from "node:fs";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "../../../../..");
const imp = (rel) => import(pathToFileURL(resolve(REPO, rel)).href);
const PROBE = resolve(HERE, "integrated-probe.mjs");

const results = { schema: "vb2-soak-rehearsal/1", at: new Date().toISOString(), repo: REPO, proofs: {} };
let hardStop = null;
const A = (cond, msg) => { if (!cond) throw new Error("ASSERT FAILED: " + msg); };

// ---------------------------------------------------------------------------------------------
// PROOF 4a — quiet-host detector fires
// ---------------------------------------------------------------------------------------------
async function proof4a() {
  const driver = await imp("src/tools/soak-driver.mjs");
  const qhm = await imp("src/quiet-host-monitor/index.mjs");
  const kit = await imp("src/quiet-host-monitor/_kit.mjs");

  const T0 = kit.T0;                       // 2026-07-13T12:00:00Z
  const iso = (ms) => new Date(ms).toISOString();
  const selfPid = 4242;                    // the "driver" pid in these synthetic snapshots
  const ncpu = 10;

  // A clean snapshot: only our own tree (self + a child soak-run we own) + our launcher/caffeinate.
  const cleanRows = [
    { pid: 1, ppid: 0, pcpu: 0.0, cmd: "/sbin/launchd" },
    { pid: 4000, ppid: 1, pcpu: 0.1, cmd: "/usr/bin/caffeinate -dimsu node src/tools/soak-driver.mjs" }, // our ancestor
    { pid: selfPid, ppid: 4000, pcpu: 0.5, cmd: "node src/tools/soak-driver.mjs --sha b9af1de" },         // self
    { pid: 4300, ppid: selfPid, pcpu: 0.4, cmd: "node src/tools/soak-run.mjs --claim 8" },                // OUR soak child (owned)
    { pid: 500, ppid: 1, pcpu: 1.2, cmd: "/usr/libexec/some-daemon" },
  ];
  // The SAME snapshot plus a genuinely FOREIGN heavy workload (unrelated second soak + xcodebuild).
  const foreignRows = [
    ...cleanRows,
    { pid: 9001, ppid: 1, pcpu: 3.0, cmd: "node /other/repo/src/tools/soak-run.mjs --claim 24" },  // foreign SECOND soak
    { pid: 9002, ppid: 1, pcpu: 95.0, cmd: "xcodebuild -scheme App build" },                        // foreign HEAVY @95%
  ];

  // --- control: clean host -> no foreign heavy -> no downgrade ---
  const rootC = kit.mkRoot("rehearsal-a-clean");
  kit.seedActiveLease(rootC, { run_id: "R_clean", now: T0 });
  const monC = qhm.createQuietHostMonitor({ root: rootC, run_id: "R_clean", run_started_at: iso(T0) });
  const scanClean = driver.scanHostRows({ rows: cleanRows, loadavg: 1.0, ncpu, selfPid });
  A(scanClean.foreignHeavy.length === 0, "clean snapshot must yield ZERO foreign-heavy (got " + JSON.stringify(scanClean.foreignHeavy) + ")");
  A(monC.eligibleNow() === true, "clean control must remain QUIET_HOST eligible");
  A(monC.snapshot().quiet_host_downgraded === false, "clean control must not be downgraded");

  // --- foreign heavy workload: detector must FIRE (the driver's exact monitorTick action) ---
  const rootF = kit.mkRoot("rehearsal-a-foreign");
  kit.seedActiveLease(rootF, { run_id: "R_foreign", now: T0 });
  const monF = qhm.createQuietHostMonitor({ root: rootF, run_id: "R_foreign", run_started_at: iso(T0) });
  A(monF.eligibleNow() === true, "foreign-run must START eligible (before injection)");
  const at = iso(T0 + 60_000);
  const scanForeign = driver.scanHostRows({ rows: foreignRows, loadavg: 9.9, ncpu, selfPid });
  A(scanForeign.foreignHeavy.length >= 2, "foreign snapshot must flag >=2 foreign-heavy (got " + scanForeign.foreignHeavy.length + ")");
  const secondSoakSeen = scanForeign.foreignHeavy.some((f) => f.second_soak === true);
  A(secondSoakSeen, "a foreign SECOND soak must be among the flagged workloads");
  let fired = null;
  for (const f of scanForeign.foreignHeavy) {
    const r = monF.prohibitedWorkloadAppeared({ at, op: f.second_soak ? "soak" : "heavy", detail: f, foreign: true });
    if (r.downgraded) fired = r;
  }
  A(fired && fired.downgraded === true, "prohibitedWorkloadAppeared must record a §5.1 downgrade");
  A(monF.eligibleNow() === false, "after foreign heavy workload the run must be INELIGIBLE (permanent §5.1)");
  A(monF.snapshot().quiet_host_downgraded === true, "monitor snapshot must show quiet_host_downgraded=true");

  // --- simulated stale heartbeat: REAL state machine -> RECOVERY_REQUIRED -> downgrade ---
  const rootS = kit.mkRoot("rehearsal-a-stale");
  kit.seedActiveLease(rootS, { run_id: "R_stale", now: T0 });   // heartbeat_at = T0, interval 30s
  const monS = qhm.createQuietHostMonitor({ root: rootS, run_id: "R_stale", run_started_at: iso(T0) });
  const nowStale = T0 + 300_000; // +5 min: past stale threshold, within TTL(1h), not expired
  const lease = kit.readLeaseFor ? null : null; // (kept simple: feed the seeded lease via store below)
  const shwl = await imp("src/shwl/index.mjs");
  const obs = monS.observeHostState({
    at: iso(nowStale),
    lease: shwl.store.readLease(rootS),
    heartbeat: shwl.store.readHeartbeat ? shwl.store.readHeartbeat(rootS) : null,
    currentBootId: "boot_QHM_1",
    isAlive: () => true,                 // owner still alive -> forces the STALE path, not OWNER_DEAD
    requester: { run_id: "R_stale" },
    lockPresent: true,
  });
  A(obs.quiet === false, "stale heartbeat must be observed as NON-quiet");
  A(monS.eligibleNow() === false, "stale heartbeat must downgrade the run to INELIGIBLE");

  results.proofs["4a_quiet_host_detector"] = {
    verdict: "PASS",
    control_clean: { foreign_heavy: scanClean.foreignHeavy.length, eligible: true, downgraded: false },
    foreign_heavy: {
      flagged: scanForeign.foreignHeavy.map((f) => ({ pid: f.pid, pcpu: f.pcpu, second_soak: f.second_soak, cmd: f.cmd })),
      downgrade_recorded: true,
      eligible_after: monF.eligibleNow(),
      episodes: monF.snapshot().episodes,
    },
    stale_heartbeat: { effective: obs.effective, detection: obs.detection, eligible_after: monS.eligibleNow() },
  };
  kit.cleanup();
}

// ---------------------------------------------------------------------------------------------
// PROOF 4b — the VB2 store is genuinely in the launch path (store-bypass must FAIL)
// ---------------------------------------------------------------------------------------------
function runProbe(env) {
  const r = spawnSync("node", [PROBE], { env: { ...process.env, ...env }, encoding: "utf8" });
  return { code: r.status, stderr: (r.stderr || "").trim() };
}
function proof4b() {
  const normal = runProbe({ FG_PROBE_TICK: "1", FG_PROBE_VERBOSE: "1" });
  const bypass = runProbe({ FG_PROBE_TICK: "1", FG_PROBE_VERBOSE: "1", FG_STORE_BYPASS: "1" });

  const storeInPath = normal.code === 0 && bypass.code !== 0;
  results.proofs["4b_store_in_launch_path"] = {
    verdict: storeInPath ? "PASS" : "FAIL",
    normal_exit: normal.code, normal_expect: 0,
    bypass_exit: bypass.code, bypass_expect: "non-zero",
    normal_stderr: normal.stderr,
    bypass_stderr: bypass.stderr,
    interpretation: storeInPath
      ? "The VB2 ClassifiedObjectStore is load-bearing: with it the probe passes; routing around it FAILS."
      : "STORE NOT IN PATH — bypassing the store did not fail the probe.",
  };
  if (normal.code !== 0) throw new Error("PROOF 4b: normal probe (store in path) did NOT pass (exit " + normal.code + "): " + normal.stderr);
  if (bypass.code === 0) {
    hardStop = "STORE NOT IN LAUNCH PATH: bypassing the VB2 ClassifiedObjectStore still PASSED. Per step 4b, STOP.";
    throw new Error(hardStop);
  }
}

// ---------------------------------------------------------------------------------------------
async function main() {
  let ok = true, err = null;
  try {
    await proof4a();
    proof4b();
  } catch (e) {
    ok = false; err = e && e.message ? e.message : String(e);
  }
  results.overall = {
    verdict: ok ? "REHEARSAL PASS — both proofs hold; proceed to the real run" : "REHEARSAL NOT-PASSED",
    hard_stop: hardStop,
    error: err,
  };
  const out = resolve(HERE, "rehearsal-result.json");
  writeFileSync(out, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
  console.log(ok ? "\nREHEARSAL PASS" : "\nREHEARSAL NOT-PASSED: " + err);
  process.exit(ok ? 0 : 1);
}
main();
