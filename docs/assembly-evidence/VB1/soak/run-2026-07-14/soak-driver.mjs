// VB1 QUALIFYING SOAK DRIVER — lease-guarded, quiet-host-monitored, 8–9h, §29.
//
// This is the RUN HARNESS for the founder-released VB1 qualifying soak. It contains NO
// product code and modifies NO product code: it only ORCHESTRATES the accepted modules
//   L1 src/freeze-manifest, L2 src/run-attestation, L3 src/environment-provenance,
//   L4 src/quiet-host-monitor, SHWL src/shwl, and the runner src/tools/soak-run.mjs.
//
// It is deliberately ONE long-lived process because it IS the lease owner: the SHWL state
// machine derives OWNER_DEAD from owner_pid liveness, so if this process exits the lease is
// void and the run is disqualified. It therefore owns: the lease, the heartbeat, the
// quiet-host monitor, the soak child, the verdict, the seal, and the release.
//
// Fail-closed: any unexpected error -> record it, seal honestly, release the lease, exit != 0.

import { execSync, spawn } from "node:child_process";
import { readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import os from "node:os";

// ---- constants ------------------------------------------------------------------------------
const REPO = "/Users/macm1/Projects/foundergate";
const SHA = "c22b86a2f70847490961595b383c0ee358aaaa33";

// REHEARSAL knobs. The REAL run overrides NOTHING and uses the §29 defaults below. A rehearsal
// sets SOAK_EV_DIR + SHWL_LEASE_ROOT to throwaway paths so the real ~/.cldh and the repo are
// never touched, and compresses the clock so the whole lifecycle is exercised in ~2 minutes.
const N = (k, d) => (process.env[k] ? Number(process.env[k]) : d);
const CLAIM_HOURS = N("SOAK_CLAIM_HOURS", 8);       // named line: "8-HOUR SOAK PASS"; span lands in 8–9h
const PROBE_INTERVAL_S = N("SOAK_INTERVAL_S", 900); // 15 min health sample (SOAK_PLAN.md)
const HEARTBEAT_EVERY_MS = N("SOAK_HB_MS", 30_000); // beat every 30s
const HEARTBEAT_INTERVAL_S = N("SOAK_HB_S", 60);    // declared -> stale only after 3x60s=180s (3x margin)
const LEASE_TTL_S = N("SOAK_TTL_S", 10 * 3600);     // MUST exceed the span; the 6h default EXPIRES mid-run
const MONITOR_EVERY_MS = N("SOAK_MON_MS", 60_000);  // quiet-host scan every 60s
const HOST_ID = "qual-host-m1";
const NCPU = os.cpus().length;
const REHEARSAL = process.env.SOAK_REHEARSAL === "1";

const EV = process.env.SOAK_EV_DIR || join(REPO, "docs/assembly-evidence/VB1/soak/run-2026-07-14");
const ATT_DIR = join(EV, "attestation");
mkdirSync(EV, { recursive: true });
mkdirSync(ATT_DIR, { recursive: true });

const now = () => Date.now();
const iso = (t = Date.now()) => new Date(t).toISOString();

// ---- evidence writers -----------------------------------------------------------------------
const INTERV = join(EV, "intervention-log.jsonl");
const MONREC = join(EV, "monitor-record.jsonl");
const DRIVERLOG = join(EV, "driver.log");

function logLine(msg) {
  const line = `[${iso()}] ${msg}`;
  console.log(line);
  appendFileSync(DRIVERLOG, line + "\n");
}
// Every intervention/anomaly, with a timestamp (§29 "log of failures and interventions").
function intervention(kind, detail) {
  const rec = { at: iso(), kind, detail };
  appendFileSync(INTERV, JSON.stringify(rec) + "\n");
  logLine(`INTERVENTION ${kind}: ${typeof detail === "string" ? detail : JSON.stringify(detail)}`);
  return rec;
}
function monSample(rec) {
  appendFileSync(MONREC, JSON.stringify({ at: iso(), ...rec }) + "\n");
}

// ---- real host observation (the monitor is pure-detection-over-DATA; WE supply the DATA) -----
//
// Classification rule (stated up front, auditable, applied mechanically):
//   VIOLATION (permanently downgrades QUIET_HOST per §5.1):
//     (a) a FOREIGN process (not in this driver's process tree) whose command matches a
//         harness/dev HEAVY signature — build, test, CI, container, browser-automation,
//         compiler, package install, or a SECOND soak — the exact class of work the lease
//         exists to keep off the host; at >=20% CPU, or ANY CPU for a second soak runner;
//     (b) system-wide SATURATION: 1-min loadavg >= NCPU for 3 consecutive samples.
//   OBSERVATION (recorded, does NOT downgrade):
//     ordinary interactive application CPU (Chrome, Slack, Terminal, the controlling harness).
//     These are not the heavy harness-controlled workloads the lease governs. Recording them
//     lets a reviewer disagree with this threshold and recompute from the raw record.
const HEAVY_SIG = /(xcodebuild|clang|swift-frontend|cargo|rustc|webpack|vite|esbuild|rollup|jest|vitest|mocha|playwright|chromedriver|puppeteer|gradle|\bmaven\b|ninja|cmake|\bdocker\b|dockerd|com\.docker|colima|qemu|ollama|llama\.cpp|\bpip\b|pnpm|\byarn\b|npm (install|ci|run build)|next build|tsc\b|python.*(train|finetune))/i;

// A SECOND soak must be a genuine node EXECUTION of the runner — not merely a command line that
// MENTIONS it. (A shell whose argv contains the words "soak-run.mjs" — e.g. the very command that
// launched this driver, or a `pgrep soak-run.mjs` — is a mention, not a workload: grep matching
// itself. Matching on mentions produced a false PROHIBITED_WORKLOAD and refused a valid release.)
const SECOND_SOAK_SIG = /\bnode\b[^|;]*\b(soak-run|reliability-soak)\.mjs\b/i;

// A shell invoked with -c carries ARBITRARY text in its argv, so its command line is never
// evidence of what it is actually doing. The real worker it spawns is its own process and IS
// scanned on its own merits. Skipping these wrappers removes a whole class of false positives.
const SHELL_WRAPPER = /^(\/\w+)*\/(z|ba|da)?sh\b.*\s-c\b/i;

function psSnapshot() {
  const out = execSync("ps -Ao pid=,ppid=,pcpu=,command=", { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
  const rows = [];
  for (const line of out.split("\n")) {
    const m = line.match(/^\s*(\d+)\s+(\d+)\s+([\d.]+)\s+(.*)$/);
    if (!m) continue;
    rows.push({ pid: +m[1], ppid: +m[2], pcpu: parseFloat(m[3]), cmd: m[4] });
  }
  return rows;
}
// Our own tree: the driver + every descendant (the soak child, its npm/node health probes).
// Work we ourselves declared is NOT a foreign violation (§ "OWNED_SUBPROCESS_NOT_A_VIOLATION").
function ownTree(rows, rootPid) {
  const kids = new Map();
  for (const r of rows) {
    if (!kids.has(r.ppid)) kids.set(r.ppid, []);
    kids.get(r.ppid).push(r.pid);
  }
  const mine = new Set([rootPid]);
  const stack = [rootPid];
  while (stack.length) {
    const p = stack.pop();
    for (const c of kids.get(p) || []) if (!mine.has(c)) { mine.add(c); stack.push(c); }
  }
  return mine;
}

// The driver's OWN ancestors (the launching shell, the harness that started it). These are the
// run's control plane, not a workload competing with it, and their argv often names the soak.
function ancestors(rows, pid) {
  const byPid = new Map(rows.map((r) => [r.pid, r]));
  const out = new Set();
  let cur = byPid.get(pid);
  while (cur && cur.ppid && cur.ppid !== 0 && !out.has(cur.ppid)) {
    out.add(cur.ppid);
    cur = byPid.get(cur.ppid);
  }
  return out;
}

let saturationStreak = 0;
function scanHost() {
  const rows = psSnapshot();
  const mine = ownTree(rows, process.pid);
  const kin = ancestors(rows, process.pid);
  const load1 = os.loadavg()[0];

  const foreignHeavy = [];
  for (const r of rows) {
    if (mine.has(r.pid)) continue;                 // our own declared soak work
    if (kin.has(r.pid)) continue;                  // our launching shell / harness, not a workload
    if (r.pid === process.pid) continue;
    if (SHELL_WRAPPER.test(r.cmd)) continue;       // a shell -c argv is text, not evidence of work
    const isSecondSoak = SECOND_SOAK_SIG.test(r.cmd);
    if (isSecondSoak || (HEAVY_SIG.test(r.cmd) && r.pcpu >= 20)) {
      foreignHeavy.push({ pid: r.pid, pcpu: r.pcpu, cmd: r.cmd.slice(0, 160), second_soak: isSecondSoak });
    }
  }

  const saturated = load1 >= NCPU;
  saturationStreak = saturated ? saturationStreak + 1 : 0;

  const topForeign = rows
    .filter((r) => !mine.has(r.pid) && r.pcpu >= 10)
    .sort((a, b) => b.pcpu - a.pcpu).slice(0, 5)
    .map((r) => ({ pcpu: r.pcpu, cmd: r.cmd.slice(0, 80) }));

  return { load1, ncpu: NCPU, foreignHeavy, saturationStreak, saturated, topForeign, procs: rows.length };
}

// =============================================================================================
// MAIN
// =============================================================================================
let handle = null;         // lease handle (owner)
let attLog = null;         // L2 attestation chain
let monitor = null;
let hbTimer = null, monTimer = null;
let runStartIso = null;
let sealed = false, released = false;

function safeSealAndRelease(endIso, reasonLabel) {
  try {
    if (attLog && !sealed) {
      const { sealRun } = attMod;
      sealRun(attLog, { end_at: endIso, at: endIso });
      sealed = true;
      logLine("L2 attestation SEALED");
    }
  } catch (e) { logLine("seal failed: " + e.message); }
  try {
    // On a preflight refusal, launchSoak returns a REFUSAL object (no release method) and has
    // already released the reservation itself — there is nothing for us to release.
    if (handle && handle.acquired && typeof handle.release === "function" && !released) {
      const r = handle.release({ reason: reasonLabel });
      released = true;
      logLine("lease release: " + JSON.stringify(r));
      writeFileSync(join(EV, "lease-release.json"), JSON.stringify({ at: iso(), reason: reasonLabel, result: r }, null, 2) + "\n");
    }
  } catch (e) { logLine("release failed: " + e.message); }
}

let attMod, shwl, qhm, soakMod;

async function main() {
  logLine(`VB1 qualifying soak driver starting — pid ${process.pid}, host ${HOST_ID}, sha ${SHA}`);

  // dynamic imports from the repo (absolute), so this harness lives outside the repo tree
  attMod = await import(join(REPO, "src/run-attestation/index.mjs"));
  shwl = await import(join(REPO, "src/shwl/index.mjs"));
  qhm = await import(join(REPO, "src/quiet-host-monitor/index.mjs"));
  soakMod = await import(join(REPO, "src/tools/reliability-soak.mjs"));
  const envProv = await import(join(REPO, "src/environment-provenance/capture.mjs"));
  const { launchSoak } = await import(join(REPO, "src/shwl/launcher.mjs"));
  const { captureIdentity } = await import(join(REPO, "src/shwl/identity.mjs"));
  const { resolveRoot, readLease, readHeartbeat, readEvents, rawLeaseText, eventsText } =
    await import(join(REPO, "src/shwl/lease-store.mjs"));
  const { capabilityLeaks } = await import(join(REPO, "src/shwl/capability.mjs"));
  const { enumerateFiles, buildFreezeManifest, verifyFreezeManifest } =
    await import(join(REPO, "src/freeze-manifest/freeze-manifest.mjs"));

  const root = resolveRoot(); // ~/.cldh/host-workload-lease

  // ---- HARD GATE re-check (fail closed; never trust an earlier check) -------------------------
  const head = execSync("git rev-parse HEAD", { cwd: REPO, encoding: "utf8" }).trim();
  if (head !== SHA) throw new Error(`HEAD ${head} != required ${SHA}`);
  const dirty = execSync("git status --porcelain src scripts package.json", { cwd: REPO, encoding: "utf8" }).trim();
  if (dirty) throw new Error(`frozen scope is dirty:\n${dirty}`);
  logLine(`HARD GATE ok — HEAD ${head}, frozen scope clean`);

  // ---- STEP 6 (L3) environment provenance ----------------------------------------------------
  const provenance = envProv.captureEnvironmentProvenance({
    env: process.env, platform: process.platform, arch: process.arch,
    cpuCount: NCPU, totalMem: os.totalmem(), nodeVersion: process.version,
    now: iso(), allowlist: ["HOME", "SHELL", "LANG", "TERM", "USER", "PATH"],
  });
  envProv.verifyNoSecrets(provenance); // throws if any secret-shaped name/value leaked
  const identity = captureIdentity({ host_id: HOST_ID });
  const provRecord = {
    ...provenance, host_id: HOST_ID, boot_id: identity.boot_id,
    hostname_note: "host label per founder release: qual-host-m1",
    uptime_s: Math.round(os.uptime()), sha_under_test: SHA,
  };
  writeFileSync(join(EV, "environment-provenance.json"), JSON.stringify(provRecord, null, 2) + "\n");
  logLine("L3 provenance captured (no secrets)");

  // ---- STEP 5 (L1) freeze manifest ------------------------------------------------------------
  // Frozen scope = the CODE THAT EXECUTES: src/ + scripts/ + package.json. Evidence is written
  // under docs/, deliberately outside the frozen set, so writing evidence cannot cause drift.
  const paths = [
    ...enumerateFiles(join(REPO, "src")).map((p) => join("src", p)),
    ...enumerateFiles(join(REPO, "scripts")).map((p) => join("scripts", p)),
    "package.json",
  ];
  const freeze = buildFreezeManifest({ root: REPO, paths, gitSha: SHA, now: iso() });
  const manifest_hash = freeze.manifest_hash;
  // The founder's external anchor: the exact git SHA under test, recorded IN the freeze record.
  const freezeRecord = {
    ...freeze,
    external_anchor: {
      expectedHeadSha: SHA,
      note: "The founder-specified external anchor: the exact git commit under test. NOTE: this is " +
            "NOT the same field as run-attestation's `expectedHeadHash`, which is the sha256 entry_hash " +
            "of the SEALED attestation head (see attestation-anchor.json, written at seal time).",
    },
    frozen_scope: ["src/**", "scripts/**", "package.json"],
    frozen_file_count: freeze.entries.length,
  };
  writeFileSync(join(EV, "freeze-manifest.json"), JSON.stringify(freezeRecord, null, 2) + "\n");
  logLine(`L1 freeze manifest built — manifest_hash ${manifest_hash}, ${freeze.entries.length} files, anchor ${SHA}`);

  // ---- STEP 4 (L4) quiet-host PREFLIGHT, part 1: shared lease guard on a FREE host -------------
  const guardPf = qhm.quietHostPreflight({
    root, op: "soak", requester: null, currentBootId: identity.boot_id, now: now(),
  });
  writeFileSync(join(EV, "preflight-guard.json"), JSON.stringify({ at: iso(), ...guardPf }, null, 2) + "\n");
  if (guardPf.quiet !== true) {
    intervention("PREFLIGHT_REFUSED_GUARD", { reason: guardPf.reason, effective: guardPf.effective, message: guardPf.message });
    throw new Error(`REFUSED: lease guard says host is not quiet: ${guardPf.reason}`);
  }
  logLine(`L4 preflight (lease guard): quiet — decision ${guardPf.decision}`);

  // ---- STEP 4 part 2 + STEP 3: real host quiet scan, run UNDER THE LOCK by launchSoak (§4.2) ---
  // The shipped preflight predicate checks LEASE state; the REAL host-quietness check (foreign
  // heavy workloads) is supplied here as the launcher's injectable preflight, which §4.2 runs
  // while the lock is held — closing the preflight race.
  let preflightScan = null;
  const realPreflight = () => {
    const s = scanHost();
    preflightScan = s;
    monSample({ phase: "preflight", ...s });
    if (s.foreignHeavy.length > 0) {
      return { quiet: false, reason: `foreign heavy workload present: ${s.foreignHeavy.map((f) => f.cmd).join(" | ")}` };
    }
    if (s.load1 >= NCPU) return { quiet: false, reason: `host saturated: loadavg ${s.load1.toFixed(2)} >= ncpu ${NCPU}` };
    return { quiet: true };
  };

  handle = launchSoak({
    root, owner_project: "foundergate",
    identity: { host_id: HOST_ID },
    heartbeat_interval_s: HEARTBEAT_INTERVAL_S,
    lease_ttl_s: LEASE_TTL_S,               // 10h — the 6h default would EXPIRE mid-run
    preflight: realPreflight,
    purpose: "VB1 8-9h qualifying soak",
  });

  if (!handle.acquired) {
    const why = handle.preflightFailed
      ? `quiet-host preflight FAILED: ${handle.reason}`
      : `lease NOT acquired: ${handle.reason} (${handle.effective})`;
    intervention("RELEASE_REFUSED", { why, handle: { ...handle } });
    writeFileSync(join(EV, "REFUSAL.json"), JSON.stringify({ at: iso(), why, handle }, null, 2) + "\n");
    throw new Error("REFUSED: " + why);
  }
  const lease_id = handle.lease_id;
  const run_id = handle.run_id;
  runStartIso = iso();
  logLine(`STEP 3/4 OK — lease acquired ${lease_id}, run ${run_id}; preflight quiet (loadavg ${preflightScan.load1.toFixed(2)}, no foreign heavy work)`);
  writeFileSync(join(EV, "lease-acquired.json"), JSON.stringify({
    at: runStartIso, lease_id, run_id, owner_project: "foundergate",
    purpose: "VB1 8-9h qualifying soak", host_id: HOST_ID, boot_id: identity.boot_id,
    owner_pid: process.pid, heartbeat_interval_s: HEARTBEAT_INTERVAL_S, lease_ttl_s: LEASE_TTL_S,
    preflight: { quiet: true, loadavg_1m: preflightScan.load1, ncpu: NCPU, foreign_heavy: [] },
  }, null, 2) + "\n");

  // ---- STEP 7 (L2) open the run attestation ----------------------------------------------------
  attLog = attMod.openRun({
    dir: ATT_DIR,
    at: runStartIso,
    run: {
      run_id, host_id: HOST_ID, boot_id: identity.boot_id,
      freeze_manifest_hash: manifest_hash,     // binds L1
      lease_id,                                 // binds the lease
      start_at: runStartIso,                    // binds the real start timestamp
      failures_log_ref: "intervention-log.jsonl",
      monitoring_window_refs: ["monitor-record.jsonl"],
    },
  });
  // Bind the founder's external git anchor into the chain as DATA.
  attMod.appendEvent(attLog, {
    at: runStartIso,
    payload: {
      kind: "EXTERNAL_ANCHOR",
      expected_head_sha: SHA,
      note: "exact git SHA under test (founder anchor)",
      claim_hours: CLAIM_HOURS, probe: "npm test", probe_interval_s: PROBE_INTERVAL_S,
    },
  });
  logLine(`L2 attestation opened — binds manifest_hash + lease_id + start_at + git anchor ${SHA}`);

  // ---- STEP 8: heartbeat + quiet-host monitor + the soak ----------------------------------------
  monitor = qhm.createQuietHostMonitor({ root, run_id, run_started_at: runStartIso });

  // requester MUST present the owner capability, else observeHostState would derive ACTIVE_HELD
  // ("a DIFFERENT run owns the host") against our OWN lease and falsely downgrade us.
  const requester = { run_id, capability: handle.lease_capability_id };

  hbTimer = setInterval(() => {
    const r = handle.heartbeat();
    if (!r.ok) intervention("HEARTBEAT_REFUSED", r); // lease_id mismatch => someone seized the host
  }, HEARTBEAT_EVERY_MS);

  const openForeign = new Set();
  monTimer = setInterval(() => {
    try {
      const s = scanHost();
      const at = iso();

      // (1) derived host-state observation through the ACCEPTED §2 state machine
      const obs = monitor.observeHostState({
        at, lease: readLease(root), heartbeat: readHeartbeat(root),
        currentBootId: identity.boot_id, isAlive: shwl.identity.isProcessAlive,
        requester, lockPresent: true,
      });
      if (!obs.quiet) intervention("QUIET_HOST_VIOLATION_STATE", { effective: obs.effective, detection: obs.detection });

      // (2) real foreign heavy workload sightings
      const seen = new Set();
      for (const f of s.foreignHeavy) {
        const key = `${f.pid}:${f.cmd.slice(0, 40)}`;
        seen.add(key);
        if (!openForeign.has(key)) {
          openForeign.add(key);
          monitor.prohibitedWorkloadAppeared({ at, op: f.second_soak ? "soak" : "heavy", detail: f, foreign: true });
          intervention("QUIET_HOST_VIOLATION_FOREIGN_WORKLOAD", f);
        }
      }
      for (const key of [...openForeign]) {
        if (!seen.has(key)) { monitor.prohibitedWorkloadCleared({ at, op: "heavy" }); openForeign.delete(key); }
      }

      // (3) sustained saturation
      if (s.saturationStreak === 3) {
        monitor.manualBypassDetected({ at, detail: { reason: "sustained saturation", load1: s.load1, ncpu: NCPU } });
        intervention("QUIET_HOST_VIOLATION_SATURATION", { load1: s.load1, ncpu: NCPU, consecutive_samples: 3 });
      }

      monSample({
        phase: "run", load1: s.load1, ncpu: NCPU, procs: s.procs,
        foreign_heavy: s.foreignHeavy, top_foreign_cpu: s.topForeign,
        effective: obs.effective, quiet: obs.quiet,
        quiet_host_eligible: monitor.eligibleNow(),
      });
    } catch (e) {
      intervention("MONITOR_ERROR", e.message);
    }
  }, MONITOR_EVERY_MS);

  // Spawn the soak runner (the §29 tool) as our DECLARED subprocess.
  const statePath = join(EV, "soak-8h.json");
  const soakOut = join(EV, "soak-console.log");
  logLine(`launching soak-run.mjs — claim ${CLAIM_HOURS}h, interval ${PROBE_INTERVAL_S}s, probe "npm test"`);
  const child = spawn("node", [
    "src/tools/soak-run.mjs",
    "--claim", String(CLAIM_HOURS),
    "--interval", String(PROBE_INTERVAL_S),
    "--sha", SHA,
    "--probe", "npm test",
    "--state", statePath,
  ], { cwd: REPO, stdio: ["ignore", "pipe", "pipe"] });

  child.stdout.on("data", (d) => appendFileSync(soakOut, d));
  child.stderr.on("data", (d) => appendFileSync(soakOut, d));

  const exitCode = await new Promise((res) => child.on("exit", (c) => res(c)));
  const endIso = iso();
  logLine(`soak-run.mjs exited with code ${exitCode}`);
  if (exitCode !== 0) intervention("SOAK_RUNNER_NONZERO_EXIT", { exitCode });

  clearInterval(hbTimer); clearInterval(monTimer);

  // ---- STEP 9: VERDICT — from the ACCUMULATOR ONLY, gated by QUIET_HOST eligibility ------------
  const soakState = JSON.parse(readFileSync(statePath, "utf8"));
  const s = soakMod.slo(soakState);
  const accumulatorPassed = soakMod.passed(soakState);          // span >= claim AND SLO AND samples>0
  const snap = monitor.snapshot();
  const quietEligible = monitor.eligibleNow() && snap.quiet_host_downgraded === false;

  // Re-verify the frozen code did not drift during the run.
  //
  // NOTE: verifyFreezeManifest() re-walks the WHOLE tree under `root` and would report every
  // unfrozen file (docs/, README, .github/) as ADDED drift — our frozen scope is deliberately
  // src/ + scripts/ + package.json only. So we re-freeze THE SAME EXPLICIT SCOPE and compare
  // manifest_hash, which is precisely the module's documented code-binding property:
  // manifest_hash covers {schema_version, git_sha, entries(path,sha256,bytes,mode)} and
  // EXCLUDES created_at, so identical code re-frozen later yields an identical hash. A changed,
  // added, removed, or chmod'd file inside the frozen scope changes the hash.
  const drift = (() => {
    try {
      const paths2 = [
        ...enumerateFiles(join(REPO, "src")).map((p) => join("src", p)),
        ...enumerateFiles(join(REPO, "scripts")).map((p) => join("scripts", p)),
        "package.json",
      ];
      const fresh = buildFreezeManifest({ root: REPO, paths: paths2, gitSha: SHA, now: iso() });
      const headNow = execSync("git rev-parse HEAD", { cwd: REPO, encoding: "utf8" }).trim();
      if (headNow !== SHA) return { ok: false, error: `git HEAD moved during the run: ${headNow} != ${SHA}` };
      if (fresh.manifest_hash === manifest_hash) {
        return { ok: true, manifest_hash, files: fresh.entries.length, head: headNow };
      }
      // Hash differs -> enumerate exactly what changed, for the honest reasons list.
      const before = new Map(freeze.entries.map((e) => [e.path, e]));
      const after = new Map(fresh.entries.map((e) => [e.path, e]));
      const changed = [];
      for (const [p, e] of after) {
        const b = before.get(p);
        if (!b) changed.push({ path: p, reason: "ADDED" });
        else if (b.sha256 !== e.sha256) changed.push({ path: p, reason: "CONTENT_CHANGED" });
        else if (b.mode !== e.mode) changed.push({ path: p, reason: "MODE_CHANGED" });
      }
      for (const p of before.keys()) if (!after.has(p)) changed.push({ path: p, reason: "REMOVED" });
      return { ok: false, drift: changed, manifest_hash_before: manifest_hash, manifest_hash_after: fresh.manifest_hash };
    } catch (e) {
      return { ok: false, error: `freeze re-verify failed: ${e.message}` }; // fail closed
    }
  })();
  if (!drift.ok) intervention("FREEZE_DRIFT", drift);
  else logLine(`L1 freeze re-verified at end — NO DRIFT (manifest_hash unchanged, ${drift.files} files)`);

  const reasons = [];
  if (!s.meetsDuration) reasons.push(`actual span ${s.spanHours.toFixed(3)}h < claimed span ${CLAIM_HOURS}h`);
  if (!s.meetsSlo) reasons.push(`availability ${(s.availability * 100).toFixed(3)}% < SLO ${(soakState.sloTarget * 100).toFixed(2)}%`);
  if (s.samples === 0) reasons.push("no health samples recorded");
  if (!quietEligible) reasons.push(`QUIET_HOST eligibility LOST (§5.1, permanent, never restored): ${JSON.stringify(snap.episodes)}`);
  if (!drift.ok) reasons.push(`frozen code drifted during the run: ${JSON.stringify(drift.drift || drift.error)}`);

  const isPass = accumulatorPassed && quietEligible && drift.ok;
  const accumulatorReport = soakMod.soakReport(soakState, { sha: SHA });

  const verdictLine = isPass
    ? `FOUNDERGATE HARNESS ${CLAIM_HOURS}-HOUR SOAK PASS`
    : `FOUNDERGATE HARNESS ${CLAIM_HOURS}-HOUR SOAK — NOT-PASSED`;

  const verdict = [
    verdictLine,
    "",
    `start: ${soakState.startTs}`,
    `end: ${soakState.endTs}`,
    `actual span: ${s.spanHours.toFixed(3)}h (claimed span ${CLAIM_HOURS}h)`,
    `SHA under test: ${SHA}`,
    `availability: ${(s.availability * 100).toFixed(3)}% (SLO ${(soakState.sloTarget * 100).toFixed(2)}%) over ${s.samples} samples (ok ${s.ok} / fail ${s.fail})`,
    `QUIET_HOST eligibility: ${quietEligible ? "INTACT for the whole run" : "LOST — permanently downgraded (§5.1)"}`,
    `frozen-code integrity: ${drift.ok ? "NO DRIFT (manifest re-verified at end)" : "DRIFT DETECTED"}`,
    `lease: ${lease_id}`,
    `run: ${run_id}`,
    `host: ${HOST_ID}`,
    "",
    isPass ? "All three gates held: actual span >= claimed span, SLO met, QUIET_HOST survived."
           : "NOT-PASSED — true reasons:",
    ...(isPass ? [] : reasons.map((r, i) => `  ${i + 1}. ${r}`)),
    "",
    "--- accumulator output (verbatim, authoritative) ---",
    accumulatorReport,
  ].join("\n");

  writeFileSync(join(EV, "VERDICT.txt"), verdict + "\n");
  logLine("VERDICT:\n" + verdict);

  attMod.appendEvent(attLog, {
    at: endIso,
    payload: {
      kind: "VERDICT", pass: isPass, verdict_line: verdictLine,
      span_hours: s.spanHours, claim_hours: CLAIM_HOURS,
      availability: s.availability, samples: s.samples, ok: s.ok, fail: s.fail,
      quiet_host_eligible: quietEligible, freeze_ok: drift.ok, reasons,
    },
  });

  // ---- STEP 10: seal + release ------------------------------------------------------------------
  attMod.sealRun(attLog, { end_at: endIso, at: endIso });
  sealed = true;
  const entries = attMod.loadEntries(ATT_DIR);
  const headHash = entries[entries.length - 1].entry_hash;  // the REAL expectedHeadHash anchor
  const chain = attMod.verifyAttestation(entries, { expectedHeadHash: headHash });
  const eligibility = attMod.isSoakEligible(entries, {
    claimSeconds: CLAIM_HOURS * 3600, expectedHeadHash: headHash,
  });
  writeFileSync(join(EV, "attestation-anchor.json"), JSON.stringify({
    sealed_at: endIso,
    expectedHeadHash: headHash,
    note: "This is run-attestation's external anchor: the sha256 entry_hash of the SEALED head. " +
          "It is NOT the git SHA. The git SHA anchor (c22b86a2...) is recorded in freeze-manifest.json " +
          "and as the EXTERNAL_ANCHOR entry in the chain.",
    expected_head_sha_git: SHA,
    chain_verdict: chain,
    soak_eligibility: eligibility,
  }, null, 2) + "\n");
  logLine(`L2 sealed — chain ${chain}, eligibility ${eligibility.status}, head ${headHash}`);

  safeSealAndRelease(endIso, isPass ? "SOAK_COMPLETE" : "SOAK_NOT_PASSED");

  // ---- copy lease-side evidence (REDACTED — the capability must never enter evidence, §4.5) ----
  const leaseNow = readLease(root);
  const redacted = leaseNow.parsed ? { ...leaseNow.parsed } : {};
  if (redacted.lease_capability_id) redacted.lease_capability_id = "[REDACTED — §4.5 capability never enters evidence]";
  if (Array.isArray(redacted.declared_subprocess_capabilities)) {
    redacted.declared_subprocess_capabilities = redacted.declared_subprocess_capabilities.map(() => "[REDACTED]");
  }
  writeFileSync(join(EV, "lease-record-redacted.json"), JSON.stringify(redacted, null, 2) + "\n");
  writeFileSync(join(EV, "lease-events.log"), eventsText(root));
  writeFileSync(join(EV, "monitor-snapshot.json"), JSON.stringify({
    ...snap, quiet_host_eligible_final: monitor.eligibleNow(),
    attestation: monitor.attestationNow(),
    monitor_rule: {
      violation_foreign_heavy: "foreign (non-tree) process matching build/test/CI/container/browser-automation/compiler/second-soak signature at >=20% CPU (any CPU for a second soak)",
      violation_saturation: `1-min loadavg >= ${NCPU} (ncpu) for 3 consecutive 60s samples`,
      observation_only: "ordinary interactive app CPU (recorded in monitor-record.jsonl, does not downgrade)",
    },
  }, null, 2) + "\n");

  // §4.5 leak proof: the capability must appear on NO evidence surface.
  const leak = capabilityLeaks(handle.lease_capability_id, {
    evidence: readFileSync(join(EV, "lease-record-redacted.json"), "utf8") +
              readFileSync(join(EV, "VERDICT.txt"), "utf8") +
              (existsSync(INTERV) ? readFileSync(INTERV, "utf8") : "") +
              readFileSync(join(EV, "monitor-snapshot.json"), "utf8"),
    eventsText: eventsText(root),
  });
  writeFileSync(join(EV, "capability-leak-scan.json"), JSON.stringify({ at: iso(), ...leak }, null, 2) + "\n");
  if (leak.leaked) intervention("CAPABILITY_LEAK", leak);

  logLine(`DONE — verdict ${isPass ? "PASS" : "NOT-PASSED"}`);
  process.exit(isPass ? 0 : 2);
}

main().catch((e) => {
  logLine("FATAL: " + (e && e.stack ? e.stack : String(e)));
  intervention("FATAL_ERROR", String(e && e.message ? e.message : e));
  try { clearInterval(hbTimer); clearInterval(monTimer); } catch { /* noop */ }
  safeSealAndRelease(iso(), "ABORTED_ERROR");
  writeFileSync(join(EV, "VERDICT.txt"),
    `FOUNDERGATE HARNESS ${CLAIM_HOURS}-HOUR SOAK — NOT-PASSED\n\n` +
    `The run did not complete. True reason:\n  ${String(e && e.message ? e.message : e)}\n\n` +
    `SHA under test: ${SHA}\nstart: ${runStartIso || "NOT STARTED"}\nend: ${iso()}\n`);
  process.exit(1);
});
