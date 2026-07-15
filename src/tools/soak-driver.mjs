// FounderGate — VB1 QUALIFYING SOAK DRIVER (reviewed, parameterized harvest).
//
// Authority:
//   - Archived run-1 operator driver: docs/assembly-evidence/VB1/soak/run-2026-07-14/
//       soak-driver.mjs @ af56552746f2ab9958183de814af4d13c5f5aab1  (the scratch this replaces)
//   - Shared Host Workload Lease (SHWL): docs/lanes/shared-host-workload-lease.md
//       @ 6a4488d8ba728f203e83d0bf0d2ee48c684134af  (§4 lifecycle, §5/§5.1 quiet-host, §8/§10 monitor)
//   - Honest-Duration & Soak-Proof Law: docs/ASSEMBLY_MANUAL.md §29 (five evidence elements)
//
// WHAT THIS IS
// -----------
// The RUN HARNESS for the founder-released VB1 qualifying soak, harvested from the run-1 operator
// scratch into REVIEWED, PARAMETERIZED, SELF-TESTED product code. It contains NO product code and
// modifies NO product code: it only ORCHESTRATES the accepted modules
//   L1 src/freeze-manifest, L2 src/run-attestation, L3 src/environment-provenance,
//   L4 src/quiet-host-monitor, SHWL src/shwl, and the runner src/tools/soak-run.mjs.
// Everything the run-1 scratch HARDCODED (repo path, SHA, claim hours, evidence dir, lease purpose,
// TTL) is now an injectable, validated PARAMETER (see validateOptions / parseArgs).
//
// It is deliberately ONE long-lived process because it IS the lease owner: the SHWL state machine
// derives OWNER_DEAD from owner_pid liveness, so if this process exits the lease is void and the run
// is disqualified. It owns: the lease, the heartbeat, the quiet-host monitor, the soak child, the
// verdict, the seal, and the release. Fail-closed: any unexpected error -> record it, seal honestly,
// release the lease, exit != 0.
//
// CAFFEINATE (documented operator contract, VERIFIED read-only here)
// -----------------------------------------------------------------
// The OPERATOR launches this driver under a system power assertion so the host does not sleep mid-run:
//
//     caffeinate -dimsu node src/tools/soak-driver.mjs --sha <40hex> --claim 24 \
//         --evidence <dir> --purpose "VB1 24h qualifying soak" --ttl 90000 --repo <repo>
//
// This module NEVER spawns caffeinate. Before the ACTIVE run it VERIFIES-AND-RECORDS (read-only, from
// a `ps` snapshot) that a `caffeinate` process holds an assertion over THIS driver's process tree
// (self / an ancestor such as the `caffeinate -dimsu <cmd>` wrapper / a descendant). The fact is
// written to evidence either way; if NO assertion is held the driver FAILS CLOSED — it refuses before
// acquiring the lease (so no lock can be orphaned) and records the refusal honestly.
//
// RUN-1 LESSONS FOLDED IN
// -----------------------
//   (a) FREEZE-SCOPE DRIFT RECHECK BY manifest_hash — the frozen scope (src/ + scripts/ + package.json)
//       is re-frozen at end and its manifest_hash asserted UNCHANGED. Drift is recorded and makes the
//       verdict honest (NOT-PASSED); it is never massaged away. (recheckFreezeDrift)
//   (b) EXPLICIT TTL — the lease TTL is a surfaced, validated parameter (default 10h) that MUST EXCEED
//       the claimed span; the SHWL 6h default would EXPIRE mid-run and void the lease. (validateOptions)
//   (c) ANCESTOR-EXCLUSION IN THE PROCESS MATCHER — run-1 self-matched because the launching shell's
//       argv literally contained a soak filename (a PREFLIGHT_FAIL false-start: grep matching itself).
//       The second-soak / heavy-workload scan now excludes SELF, DESCENDANTS, and ANCESTORS (plus
//       `sh -c` wrappers whose argv is text, not work) while STILL catching a genuine unrelated second
//       soak or heavy foreign workload. (scanHostRows / buildOwnTree / buildAncestors)
//   (d) REFUSAL-PATH RELEASE GUARD — on ANY refusal/preflight-fail the lease reservation is released
//       cleanly (the SHWL launcher releases on PREFLIGHT_FAIL; the caffeinate refusal happens BEFORE
//       acquisition; the fatal path calls safeSealAndRelease). No orphaned lock. (acquireGuardedLease)
//
// VERDICT
// -------
// The verdict is the accumulator AND-gate ONLY:
//     availability SLO  AND  QUIET_HOST eligibility (§5.1)  AND  frozen-code integrity (manifest_hash).
// All five §29 elements (named line, real start/end timestamps, exact SHA, monitoring evidence,
// failures/interventions log) are emitted for EITHER verdict. An honest NOT-PASSED is acceptable and
// correct; a verdict is NEVER massaged.
//
// Pure Node v24 ESM, zero external deps. Every side-effectful dependency (ps, loadavg, clock, spawn,
// git, module resolution, lease root) is injectable so the whole harness is unit-testable on OS-temp
// roots with NO real soak, NO real ~/.cldh, and NO caffeinate.

import { execSync, spawn } from "node:child_process";
import { readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import os from "node:os";

export class SoakDriverError extends Error {
  constructor(message) { super(message); this.name = "SoakDriverError"; }
}

// A 40-char lowercase-hex git commit SHA. Short SHAs and phantom refs are rejected (Law 54 spirit).
export const HEX40 = /^[0-9a-f]{40}$/;

// The frozen scope = THE CODE THAT EXECUTES. Evidence is written under docs/, deliberately outside
// this set, so writing evidence cannot cause drift.
export const FROZEN_SCOPE = Object.freeze(["src/**", "scripts/**", "package.json"]);

// -------------------------------------------------------------------------------------------------
// PROCESS-MATCHER SIGNATURES
// -------------------------------------------------------------------------------------------------
export const SIGNATURES = Object.freeze({
  // Harness/dev HEAVY signatures — the class of work the lease exists to keep off a quiet host.
  HEAVY: /(xcodebuild|clang|swift-frontend|cargo|rustc|webpack|vite|esbuild|rollup|jest|vitest|mocha|playwright|chromedriver|puppeteer|gradle|\bmaven\b|ninja|cmake|\bdocker\b|dockerd|com\.docker|colima|qemu|ollama|llama\.cpp|\bpip\b|pnpm|\byarn\b|npm (install|ci|run build)|next build|tsc\b|python.*(train|finetune))/i,
  // A SECOND soak must be a genuine node EXECUTION of a soak entry point — not merely a command line
  // that MENTIONS one (run-1's PREFLIGHT_FAIL false-start: a shell argv naming the file).
  SECOND_SOAK: /\bnode\b[^|;]*\b(soak-run|reliability-soak|soak-driver)\.mjs\b/i,
  // A shell invoked with -c carries ARBITRARY text in its argv; its command line is never evidence of
  // what it is actually DOING. The real worker it spawns is its own process, scanned on its own merits.
  SHELL_WRAPPER: /^(\/\w+)*\/(z|ba|da)?sh\b.*\s-c\b/i,
  // macOS power-assertion holder.
  CAFFEINATE: /(^|\/)caffeinate\b/i,
});

// =================================================================================================
// PARAMETERS — validation (no hardcoding)
// =================================================================================================

function num(v, name, errors, { min = null, integer = false } = {}) {
  if (typeof v !== "number" || !Number.isFinite(v)) { errors.push(`\`${name}\` must be a finite number`); return undefined; }
  if (integer && !Number.isInteger(v)) { errors.push(`\`${name}\` must be an integer`); return undefined; }
  if (min !== null && !(v > min)) { errors.push(`\`${name}\` must be > ${min}`); return undefined; }
  return v;
}

function str(v, name, errors) {
  if (typeof v !== "string" || v.trim().length === 0) { errors.push(`\`${name}\` must be a non-empty string`); return undefined; }
  return v;
}

// validateOptions(raw) -> normalized options, or throws SoakDriverError listing EVERY problem.
// All of { sha, claimHours, evidenceDir, leasePurpose } are injectable and validated; TTL is an
// explicit parameter (run-1 lesson b) that MUST EXCEED the claimed span.
export function validateOptions(raw = {}) {
  if (raw === null || typeof raw !== "object") throw new SoakDriverError("options must be an object");
  const errors = [];
  const o = {};

  if (typeof raw.sha !== "string" || !HEX40.test(raw.sha)) {
    errors.push("`sha` must be a 40-char lowercase-hex git commit SHA (the freeze/attest anchor under test)");
  } else o.sha = raw.sha;

  o.claimHours = num(raw.claimHours, "claimHours", errors, { min: 0 });
  o.evidenceDir = str(raw.evidenceDir, "evidenceDir", errors);
  o.leasePurpose = str(raw.leasePurpose, "leasePurpose", errors);
  o.repo = str(raw.repo, "repo", errors);
  o.leaseTtlSeconds = num(raw.leaseTtlSeconds, "leaseTtlSeconds", errors, { min: 0 });

  // Optional, defaulted, still validated.
  o.hostId = raw.hostId === undefined ? "qual-host" : str(raw.hostId, "hostId", errors);
  o.probe = raw.probe === undefined ? "npm test" : str(raw.probe, "probe", errors);
  o.sloTarget = raw.sloTarget === undefined ? 0.99 : num(raw.sloTarget, "sloTarget", errors, { min: 0 });
  if (o.sloTarget !== undefined && o.sloTarget > 1) errors.push("`sloTarget` must be <= 1");
  o.probeIntervalSeconds = raw.probeIntervalSeconds === undefined ? 900 : num(raw.probeIntervalSeconds, "probeIntervalSeconds", errors, { min: 0 });
  o.heartbeatIntervalSeconds = raw.heartbeatIntervalSeconds === undefined ? 60 : num(raw.heartbeatIntervalSeconds, "heartbeatIntervalSeconds", errors, { min: 0 });
  o.heartbeatEveryMs = raw.heartbeatEveryMs === undefined ? 30_000 : num(raw.heartbeatEveryMs, "heartbeatEveryMs", errors, { min: 0 });
  o.monitorEveryMs = raw.monitorEveryMs === undefined ? 60_000 : num(raw.monitorEveryMs, "monitorEveryMs", errors, { min: 0 });
  o.heavyCpuThreshold = raw.heavyCpuThreshold === undefined ? 20 : num(raw.heavyCpuThreshold, "heavyCpuThreshold", errors, { min: -1 });

  // CROSS-FIELD (run-1 lesson b): a TTL that does not exceed the claimed span expires mid-run and
  // voids the lease. Refuse it up front rather than discover it at hour N.
  if (o.leaseTtlSeconds !== undefined && o.claimHours !== undefined) {
    const spanSeconds = o.claimHours * 3600;
    if (!(o.leaseTtlSeconds > spanSeconds)) {
      errors.push(`\`leaseTtlSeconds\` (${o.leaseTtlSeconds}s) must EXCEED the claimed span (${spanSeconds}s); a lease that expires mid-run disqualifies it`);
    }
  }

  if (errors.length) throw new SoakDriverError("invalid soak-driver options:\n  - " + errors.join("\n  - "));
  return o;
}

// parseArgs(argv) — CLI front door. `argv` is the full process.argv (or a slice); flags are
//   --sha --claim --evidence --purpose --ttl --repo [--host --probe --interval --slo]
export function parseArgs(argv = process.argv) {
  const get = (n) => { const i = argv.indexOf(`--${n}`); return i > -1 ? argv[i + 1] : undefined; };
  const optNum = (n) => { const v = get(n); return v === undefined ? undefined : Number(v); };
  return validateOptions({
    sha: get("sha"),
    claimHours: optNum("claim"),
    evidenceDir: get("evidence"),
    leasePurpose: get("purpose"),
    leaseTtlSeconds: optNum("ttl"),
    repo: get("repo"),
    hostId: get("host"),
    probe: get("probe"),
    probeIntervalSeconds: optNum("interval"),
    sloTarget: optNum("slo"),
  });
}

// =================================================================================================
// PROCESS TREE / MATCHER — run-1 lesson (c): ancestor-exclusion
// =================================================================================================

// Our own tree: rootPid + every descendant (the soak child, its npm/node health probes). Work we
// ourselves declared is NOT a foreign violation.
export function buildOwnTree(rows, rootPid) {
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

// The driver's OWN ancestors (the launching shell, the `caffeinate -dimsu` wrapper, the harness that
// started it). These are the run's control plane, not a workload competing with it, and their argv
// often names the soak file (the run-1 false-match). Excluded from the "second soak" scan.
export function buildAncestors(rows, pid) {
  const byPid = new Map(rows.map((r) => [r.pid, r]));
  const out = new Set();
  let cur = byPid.get(pid);
  while (cur && cur.ppid && cur.ppid !== 0 && !out.has(cur.ppid)) {
    out.add(cur.ppid);
    cur = byPid.get(cur.ppid);
  }
  return out;
}

// scanHostRows — classify a `ps` snapshot (all DATA, injected). A FOREIGN process (not self, not a
// descendant, not an ancestor, not a `sh -c` wrapper) is a VIOLATION when it either executes a soak
// entry point (any CPU) OR matches a heavy signature at >= heavyCpuThreshold %CPU. Excluding
// self/descendants/ancestors is precisely run-1 lesson (c): it stops the driver matching itself or
// its launcher while STILL catching a genuine unrelated second soak.
export function scanHostRows({ rows, loadavg, ncpu, selfPid, heavyCpuThreshold = 20 }) {
  if (!Array.isArray(rows)) throw new SoakDriverError("scanHostRows: rows must be an array");
  const mine = buildOwnTree(rows, selfPid);
  const kin = buildAncestors(rows, selfPid);
  const foreignHeavy = [];
  for (const r of rows) {
    if (mine.has(r.pid)) continue;                 // our own declared soak work
    if (kin.has(r.pid)) continue;                  // our launcher / caffeinate wrapper — control plane
    if (r.pid === selfPid) continue;
    if (SIGNATURES.SHELL_WRAPPER.test(r.cmd)) continue; // a shell -c argv is text, not evidence of work
    const isSecondSoak = SIGNATURES.SECOND_SOAK.test(r.cmd);
    if (isSecondSoak || (SIGNATURES.HEAVY.test(r.cmd) && r.pcpu >= heavyCpuThreshold)) {
      foreignHeavy.push({ pid: r.pid, pcpu: r.pcpu, cmd: String(r.cmd).slice(0, 160), second_soak: isSecondSoak });
    }
  }
  const load1 = loadavg;
  const topForeign = rows
    .filter((r) => !mine.has(r.pid) && r.pcpu >= 10)
    .sort((a, b) => b.pcpu - a.pcpu).slice(0, 5)
    .map((r) => ({ pcpu: r.pcpu, cmd: String(r.cmd).slice(0, 80) }));
  return {
    load1, ncpu, foreignHeavy, saturated: load1 >= ncpu, topForeign, procs: rows.length,
    excluded: { own: [...mine], ancestors: [...kin] },
  };
}

// =================================================================================================
// CAFFEINATE ASSERTION — verify-and-record (read-only), fail-closed
// =================================================================================================

// verifyCaffeine — read-only detection that a `caffeinate` process holds an assertion over THIS
// driver's process tree. The documented launch is `caffeinate -dimsu <driver>`, so the holder is
// normally an ANCESTOR; a self- or descendant-held assertion is also honored. NEVER spawns anything.
export function verifyCaffeine({ rows, selfPid }) {
  if (!Array.isArray(rows)) throw new SoakDriverError("verifyCaffeine: rows must be an array");
  const mine = buildOwnTree(rows, selfPid); // self + descendants
  const kin = buildAncestors(rows, selfPid); // ancestors (the caffeinate -dimsu wrapper)
  const holders = [];
  for (const r of rows) {
    if (!SIGNATURES.CAFFEINATE.test(r.cmd)) continue;
    let via = null;
    if (r.pid === selfPid) via = "self";
    else if (kin.has(r.pid)) via = "ancestor";
    else if (mine.has(r.pid)) via = "descendant";
    if (via) holders.push({ pid: r.pid, cmd: String(r.cmd).slice(0, 160), via });
  }
  return { held: holders.length > 0, holders, checked_pids: rows.length };
}

// =================================================================================================
// FREEZE DRIFT RE-CHECK — run-1 lesson (a): re-freeze the SAME scope, assert manifest_hash unchanged
// =================================================================================================

// recheckFreezeDrift — re-freeze the explicit frozen scope and compare manifest_hash to the baseline
// captured at run start. manifest_hash covers {schema_version, git_sha, entries(path,sha256,bytes,
// mode)} and EXCLUDES created_at, so identical code re-frozen later yields an identical hash; a
// changed / added / removed / chmod'd file inside the scope changes it. Also asserts git HEAD did not
// move. Fail-closed: any error -> { ok:false }. The freeze functions and git reader are injected.
export function recheckFreezeDrift({
  repo, sha, paths, baselineManifestHash, baselineEntries,
  enumerateFiles, buildFreezeManifest, gitHead, now = new Date(0).toISOString(),
}) {
  try {
    const scopePaths = paths ?? [
      ...enumerateFiles(join(repo, "src")).map((p) => join("src", p)),
      ...enumerateFiles(join(repo, "scripts")).map((p) => join("scripts", p)),
      "package.json",
    ];
    const fresh = buildFreezeManifest({ root: repo, paths: scopePaths, gitSha: sha, now });
    const headNow = gitHead(repo);
    if (headNow !== sha) return { ok: false, error: `git HEAD moved during the run: ${headNow} != ${sha}` };
    if (fresh.manifest_hash === baselineManifestHash) {
      return { ok: true, manifest_hash: baselineManifestHash, files: fresh.entries.length, head: headNow };
    }
    // Hash differs -> enumerate EXACTLY what changed, for the honest reasons list.
    const before = new Map((baselineEntries || []).map((e) => [e.path, e]));
    const after = new Map(fresh.entries.map((e) => [e.path, e]));
    const drift = [];
    for (const [p, e] of after) {
      const b = before.get(p);
      if (!b) drift.push({ path: p, reason: "ADDED" });
      else if (b.sha256 !== e.sha256) drift.push({ path: p, reason: "CONTENT_CHANGED" });
      else if (b.mode !== e.mode) drift.push({ path: p, reason: "MODE_CHANGED" });
    }
    for (const p of before.keys()) if (!after.has(p)) drift.push({ path: p, reason: "REMOVED" });
    return { ok: false, drift, manifest_hash_before: baselineManifestHash, manifest_hash_after: fresh.manifest_hash };
  } catch (e) {
    return { ok: false, error: `freeze re-verify failed: ${e.message}` }; // fail closed
  }
}

// =================================================================================================
// VERDICT — the accumulator AND-gate ONLY; all five §29 elements for EITHER verdict
// =================================================================================================

// computeVerdict — verdict = availability SLO AND QUIET_HOST eligibility AND frozen-code integrity.
// `accumulatorPassed` already folds duration + SLO + sam>0 (src/tools/reliability-soak passed()).
// Emits the five §29 elements for both PASS and NOT-PASSED. Never massages a verdict.
export function computeVerdict({
  options, slo, accumulatorPassed, quietEligible, drift, soakState, ids,
  monitoringRefs = ["monitor-record.jsonl", "monitor-snapshot.json"],
  failuresRef = "intervention-log.jsonl", caffeine = null, accumulatorReport = null,
}) {
  const s = slo;
  const reasons = [];
  if (!s.meetsDuration) reasons.push(`actual span ${s.spanHours.toFixed(3)}h < claimed span ${options.claimHours}h`);
  if (!s.meetsSlo) reasons.push(`availability ${(s.availability * 100).toFixed(3)}% < SLO ${(options.sloTarget * 100).toFixed(2)}%`);
  if (s.samples === 0) reasons.push("no health samples recorded");
  if (!quietEligible) reasons.push("QUIET_HOST eligibility LOST (§5.1, permanent, never restored)");
  if (!drift.ok) reasons.push(`frozen code drifted during the run: ${JSON.stringify(drift.drift || drift.error)}`);

  // THE AND-GATE — exactly the three named elements. Nothing else can force a PASS.
  const isPass = accumulatorPassed === true && quietEligible === true && drift.ok === true;

  const verdictLine = isPass
    ? `FOUNDERGATE HARNESS ${options.claimHours}-HOUR SOAK PASS`             // (1) named PASS line
    : `FOUNDERGATE HARNESS ${options.claimHours}-HOUR SOAK — NOT-PASSED`;    // (1) named verdict line

  const lines = [
    verdictLine,
    "",
    `start: ${soakState?.startTs ?? "UNKNOWN"}`,                             // (2) real start/end timestamps
    `end: ${soakState?.endTs ?? "UNKNOWN"}`,
    `actual span: ${s.spanHours.toFixed(3)}h (claimed span ${options.claimHours}h)`,
    `SHA under test: ${options.sha}`,                                        // (3) exact SHA under test
    `availability: ${(s.availability * 100).toFixed(3)}% (SLO ${(options.sloTarget * 100).toFixed(2)}%) over ${s.samples} samples (ok ${s.ok} / fail ${s.fail})`,
    `monitoring evidence: ${monitoringRefs.join(", ")}`,                     // (4) monitoring evidence during the run
    `failures & interventions log: ${failuresRef}`,                         // (5) log of failures and interventions
    `QUIET_HOST eligibility: ${quietEligible ? "INTACT for the whole run" : "LOST — permanently downgraded (§5.1)"}`,
    `caffeinate power assertion: ${caffeine ? (caffeine.held ? `HELD (${caffeine.holders.map((h) => h.via).join(",") || "yes"})` : "NOT HELD") : "UNKNOWN"}`,
    `frozen-code integrity: ${drift.ok ? "NO DRIFT (manifest re-verified at end)" : "DRIFT DETECTED"}`,
    `lease: ${ids?.lease_id ?? "UNKNOWN"}`,
    `run: ${ids?.run_id ?? "UNKNOWN"}`,
    `host: ${options.hostId}`,
    "",
    isPass
      ? "AND-gate held: availability SLO AND QUIET_HOST eligibility AND frozen-code integrity all TRUE."
      : "NOT-PASSED — true reasons:",
    ...(isPass ? [] : reasons.map((r, i) => `  ${i + 1}. ${r}`)),
  ];
  if (accumulatorReport) {
    lines.push("", "--- accumulator output (verbatim, authoritative) ---", accumulatorReport);
  }
  return { isPass, verdictLine, reasons, text: lines.join("\n") };
}

// =================================================================================================
// EVIDENCE SINK
// =================================================================================================

// makeEvidence — the driver's write surface. All paths live under evidenceDir (outside the frozen
// scope). Injectable-friendly; pure of any global state.
export function makeEvidence(evidenceDir, { iso = () => new Date().toISOString() } = {}) {
  mkdirSync(evidenceDir, { recursive: true });
  const driverLog = join(evidenceDir, "driver.log");
  const interventions = join(evidenceDir, "intervention-log.jsonl");
  const monitorRec = join(evidenceDir, "monitor-record.jsonl");
  let interventionLogOpened = false;   // idempotency: the sentinel is written at most once
  const log = (msg) => {
    const line = `[${iso()}] ${msg}`;
    // eslint-disable-next-line no-console
    console.log(line);
    appendFileSync(driverLog, line + "\n");
  };
  return {
    dir: evidenceDir,
    log,
    write(name, obj) { writeFileSync(join(evidenceDir, name), JSON.stringify(obj, null, 2) + "\n"); },
    writeText(name, text) { writeFileSync(join(evidenceDir, name), text + "\n"); },
    // §29 element 5: OPEN the interventions log at run start with exactly one honest sentinel line.
    // WHY (SD-1): the verdict emitter names intervention-log.jsonl unconditionally, but the file used
    // to be created only on the first intervention() append — so a ZERO-intervention run produced no
    // file (or, if hand-added, a 0-byte file the evidence-integrity guard rejects). Opening the log
    // with a sentinel makes a zero-intervention run yield a NON-EMPTY, manifest-consistent file. The
    // sentinel is NOT an intervention: it carries `type:"log-opened"` and never a `kind`, so a
    // sentinel-only file unambiguously means ZERO interventions; real interventions append AFTER it.
    // Idempotent (writes at most once) and append-only (never truncates/displaces a real record).
    openInterventionLog(run_id = null) {
      if (interventionLogOpened) return;
      interventionLogOpened = true;
      const sentinel = {
        type: "log-opened",
        note: "interventions log opened at run start; zero interventions unless lines follow",
        ts: iso(),
        run_id,
      };
      appendFileSync(interventions, JSON.stringify(sentinel) + "\n");
      log(`intervention-log opened (sentinel) — run ${run_id ?? "UNKNOWN"}`);
    },
    // §29 element 5: every intervention/anomaly, timestamped. Appends after the sentinel (if opened).
    intervention(kind, detail) {
      const rec = { at: iso(), kind, detail };
      appendFileSync(interventions, JSON.stringify(rec) + "\n");
      log(`INTERVENTION ${kind}: ${typeof detail === "string" ? detail : JSON.stringify(detail)}`);
      return rec;
    },
    // §29 element 4: monitoring evidence captured DURING the run.
    monSample(rec) { appendFileSync(monitorRec, JSON.stringify({ at: iso(), ...rec }) + "\n"); },
    interventionsRef: "intervention-log.jsonl",
    monitorRef: "monitor-record.jsonl",
  };
}

// =================================================================================================
// GUARDED LEASE ACQUISITION — run-1 lessons (b) explicit TTL + (d) refusal-path release guard
// =================================================================================================

// acquireGuardedLease — verify caffeinate (fail-closed BEFORE acquiring, so no lock can be orphaned),
// then acquire the lease with an EXPLICIT TTL and the injected quiet-host preflight (which the SHWL
// launcher runs WHILE HOLDING THE LOCK, §4.2). On ANY refusal the reservation is released cleanly:
//   - caffeinate-not-held  -> refuse before acquisition (nothing to release);
//   - preflight-not-quiet  -> launchSoak itself releases the reservation (PREFLIGHT_FAIL) and removes
//                             the lock; the returned handle has no release() and none is orphaned;
//   - held-by-another-run  -> we never owned the lock, so we never touch it.
// Returns { acquired:true, handle } or { acquired:false, refused:true, reason, ... }.
export function acquireGuardedLease({
  root, options, caffeine, preflight, launchSoak, evidence, now = Date.now,
}) {
  const iso = () => new Date(now()).toISOString();

  // Record the caffeinate fact honestly, either way.
  evidence.write("caffeine-assertion.json", { at: iso(), required: true, ...caffeine });
  if (!caffeine.held) {
    evidence.intervention("CAFFEINATE_NOT_HELD", { holders: caffeine.holders });
    evidence.write("REFUSAL.json", {
      at: iso(), why: "caffeinate power assertion NOT held over the driver's process tree (fail-closed)", caffeine,
    });
    return { acquired: false, refused: true, reason: "CAFFEINATE_NOT_HELD" };
  }

  const handle = launchSoak({
    root,
    owner_project: "foundergate",
    identity: { host_id: options.hostId },
    heartbeat_interval_s: options.heartbeatIntervalSeconds,
    lease_ttl_s: options.leaseTtlSeconds,     // EXPLICIT TTL (lesson b) — must exceed the span
    preflight,
  });

  if (!handle.acquired) {
    const why = handle.preflightFailed
      ? `quiet-host preflight FAILED: ${handle.reason}`
      : `lease NOT acquired: ${handle.reason} (${handle.effective})`;
    evidence.intervention("ACQUISITION_REFUSED", { why, preflightFailed: !!handle.preflightFailed });
    evidence.write("REFUSAL.json", { at: iso(), why, handle: { ...handle } });
    // Belt-and-suspenders: if a refusal ever hands back a still-held handle, release it cleanly.
    if (handle.acquired && typeof handle.release === "function") {
      try { handle.release({ reason: "REFUSED_CLEANUP" }); } catch { /* best-effort */ }
    }
    return { acquired: false, refused: true, reason: why, handle };
  }
  return { acquired: true, handle };
}

// =================================================================================================
// PRODUCTION DEPENDENCIES (real ps / loadavg / git / spawn). Never invoked at import time.
// =================================================================================================

export function realPsSnapshot() {
  const out = execSync("ps -Ao pid=,ppid=,pcpu=,command=", { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
  const rows = [];
  for (const line of out.split("\n")) {
    const m = line.match(/^\s*(\d+)\s+(\d+)\s+([\d.]+)\s+(.*)$/);
    if (!m) continue;
    rows.push({ pid: +m[1], ppid: +m[2], pcpu: parseFloat(m[3]), cmd: m[4] });
  }
  return rows;
}
export function realGitHead(repo) { return execSync("git rev-parse HEAD", { cwd: repo, encoding: "utf8" }).trim(); }
export function realGitDirty(repo) { return execSync("git status --porcelain src scripts package.json", { cwd: repo, encoding: "utf8" }).trim(); }
export function realSpawnSoak({ repo, options, statePath, onData }) {
  const child = spawn("node", [
    "src/tools/soak-run.mjs",
    "--claim", String(options.claimHours),
    "--interval", String(options.probeIntervalSeconds),
    "--sha", options.sha,
    "--probe", options.probe,
    "--state", statePath,
  ], { cwd: repo, stdio: ["ignore", "pipe", "pipe"] });
  if (onData) { child.stdout.on("data", onData); child.stderr.on("data", onData); }
  return new Promise((res) => child.on("exit", (c) => res(c)));
}

// =================================================================================================
// ORCHESTRATION — the long-lived owner process
// =================================================================================================

// runSoakDriver(options, deps) — the full lifecycle. Returns { isPass, verdictText, ids, reasons }.
// Every side-effect is injected via `deps` so the harness is testable on OS-temp roots. Production
// (the CLI branch below) wires the REAL modules, ps, loadavg, git, spawn, and lease root.
//
// deps:
//   modules       required: { freeze, attestation, shwl, qhm, soak, envProv,
//                              launchSoak, captureIdentity, leaseStore, capability }
//   leaseRoot     lease dir (temp in tests; the SHWL resolveRoot() default in prod)
//   psSnapshot()  -> rows;  loadavg() -> 1-min number;  ncpu number;  selfPid number
//   now()         -> ms (mutable clock in tests);  spawnSoak({repo,options,statePath,onData}) -> exit
//   gitHead(repo), gitDirty(repo)
//   orchestrateActive?  optional test hook replacing the setInterval monitor loop (see below)
export async function runSoakDriver(rawOptions, deps = {}) {
  const options = validateOptions(rawOptions);
  const {
    modules, leaseRoot, psSnapshot, loadavg, ncpu, selfPid = process.pid,
    now = Date.now, spawnSoak, gitHead, gitDirty, orchestrateActive = null,
  } = deps;
  if (!modules) throw new SoakDriverError("runSoakDriver: deps.modules is required");

  const nowMs = () => now();
  const iso = (t = nowMs()) => new Date(t).toISOString();
  const ev = makeEvidence(options.evidenceDir, { iso: () => iso() });
  const attDir = join(options.evidenceDir, "attestation");
  mkdirSync(attDir, { recursive: true });

  const { freeze, attestation, shwl, qhm, soak, envProv, launchSoak, captureIdentity, leaseStore } = modules;

  let handle = null, attLog = null, sealed = false, released = false, runStartIso = null;

  const safeSealAndRelease = (endIso, reasonLabel) => {
    try {
      if (attLog && !sealed) { attestation.sealRun(attLog, { end_at: endIso, at: endIso }); sealed = true; ev.log("L2 attestation SEALED"); }
    } catch (e) { ev.log("seal failed: " + e.message); }
    try {
      if (handle && handle.acquired && typeof handle.release === "function" && !released) {
        const r = handle.release({ reason: reasonLabel });
        released = true;
        ev.write("lease-release.json", { at: iso(), reason: reasonLabel, result: r });
        ev.log("lease release: " + JSON.stringify(r));
      }
    } catch (e) { ev.log("release failed: " + e.message); }
  };

  try {
    ev.log(`VB1 qualifying soak driver — pid ${selfPid}, host ${options.hostId}, sha ${options.sha}, claim ${options.claimHours}h, ttl ${options.leaseTtlSeconds}s`);
    ev.log(`operator contract: launched under \`caffeinate -dimsu\` (verified read-only, never spawned here)`);

    const identity = captureIdentity({ host_id: options.hostId });

    // HARD GATE (fail closed): HEAD must equal the anchor SHA and the frozen scope must be clean.
    const head = gitHead(options.repo);
    if (head !== options.sha) throw new SoakDriverError(`HEAD ${head} != required ${options.sha}`);
    const dirty = gitDirty(options.repo);
    if (dirty) throw new SoakDriverError(`frozen scope is dirty:\n${dirty}`);
    ev.log(`HARD GATE ok — HEAD ${head}, frozen scope clean`);

    // L3 environment provenance (no secrets).
    const provenance = envProv.captureEnvironmentProvenance({
      env: process.env, platform: process.platform, arch: process.arch,
      cpuCount: ncpu, totalMem: os.totalmem(), nodeVersion: process.version,
      now: iso(), allowlist: ["HOME", "SHELL", "LANG", "TERM", "USER", "PATH"],
    });
    envProv.verifyNoSecrets(provenance);
    ev.write("environment-provenance.json", { ...provenance, host_id: options.hostId, boot_id: identity.boot_id, sha_under_test: options.sha, purpose: options.leasePurpose });
    ev.log("L3 provenance captured (no secrets)");

    // L1 freeze manifest of the frozen scope.
    const scopePaths = [
      ...freeze.enumerateFiles(join(options.repo, "src")).map((p) => join("src", p)),
      ...freeze.enumerateFiles(join(options.repo, "scripts")).map((p) => join("scripts", p)),
      "package.json",
    ];
    const baseline = freeze.buildFreezeManifest({ root: options.repo, paths: scopePaths, gitSha: options.sha, now: iso() });
    ev.write("freeze-manifest.json", {
      ...baseline, external_anchor: { expectedHeadSha: options.sha }, frozen_scope: FROZEN_SCOPE, frozen_file_count: baseline.entries.length,
    });
    ev.log(`L1 freeze manifest — manifest_hash ${baseline.manifest_hash}, ${baseline.entries.length} files, anchor ${options.sha}`);

    // CAFFEINATE verify-and-record (read-only) BEFORE acquisition.
    const caffeine = verifyCaffeine({ rows: psSnapshot(), selfPid });
    ev.log(`caffeinate assertion: ${caffeine.held ? "HELD (" + caffeine.holders.map((h) => h.via).join(",") + ")" : "NOT HELD"}`);

    // L4 lease-guard preflight + real host-quietness scan, run UNDER THE LOCK by the launcher (§4.2).
    let preflightScan = null;
    const preflight = () => {
      const s = scanHostRows({ rows: psSnapshot(), loadavg: loadavg(), ncpu, selfPid, heavyCpuThreshold: options.heavyCpuThreshold });
      preflightScan = s;
      ev.monSample({ phase: "preflight", ...s });
      if (s.foreignHeavy.length > 0) return { quiet: false, reason: `foreign heavy workload present: ${s.foreignHeavy.map((f) => f.cmd).join(" | ")}` };
      if (s.saturated) return { quiet: false, reason: `host saturated: loadavg ${s.load1.toFixed(2)} >= ncpu ${ncpu}` };
      return { quiet: true };
    };

    const guard = acquireGuardedLease({ root: leaseRoot, options, caffeine, preflight, launchSoak, evidence: ev, now });
    if (!guard.acquired) {
      // Refusal path: honest NOT-PASSED verdict with all five §29 elements; lease already clean.
      const emptySlo = soak.slo(soak.newSoak(options.claimHours, { sloTarget: options.sloTarget }));
      const verdict = computeVerdict({
        options, slo: emptySlo, accumulatorPassed: false, quietEligible: false,
        drift: { ok: false, error: `run refused before start: ${guard.reason}` },
        soakState: null, ids: {}, caffeine,
      });
      ev.writeText("VERDICT.txt", verdict.text);
      ev.log("REFUSED — NOT-PASSED (clean release, no orphaned lock)");
      return { isPass: false, verdictText: verdict.text, ids: {}, reasons: verdict.reasons, refused: true };
    }

    handle = guard.handle;
    const { lease_id, run_id } = handle;
    runStartIso = iso();
    // SD-1: open the §29 interventions log at run start (sentinel line) so a zero-intervention run
    // still produces a non-empty, manifest-consistent intervention-log.jsonl. Real interventions append after.
    ev.openInterventionLog(run_id);
    ev.write("lease-acquired.json", {
      at: runStartIso, lease_id, run_id, owner_project: "foundergate", purpose: options.leasePurpose,
      host_id: options.hostId, boot_id: identity.boot_id, owner_pid: selfPid,
      heartbeat_interval_s: options.heartbeatIntervalSeconds, lease_ttl_s: options.leaseTtlSeconds,
      preflight: { quiet: true, loadavg_1m: preflightScan.load1, ncpu, foreign_heavy: [] },
    });
    ev.log(`lease acquired ${lease_id}, run ${run_id}; TTL ${options.leaseTtlSeconds}s; preflight quiet`);

    // L2 attestation — binds manifest_hash + lease_id + start_at.
    attLog = attestation.openRun({
      dir: attDir, at: runStartIso,
      run: {
        run_id, host_id: options.hostId, boot_id: identity.boot_id,
        freeze_manifest_hash: baseline.manifest_hash, lease_id, start_at: runStartIso,
        failures_log_ref: ev.interventionsRef, monitoring_window_refs: [ev.monitorRef],
      },
    });
    attestation.appendEvent(attLog, { at: runStartIso, payload: { kind: "EXTERNAL_ANCHOR", expected_head_sha: options.sha, claim_hours: options.claimHours, purpose: options.leasePurpose, probe: options.probe } });

    // L4 continuous monitor, bound to this run.
    const monitor = qhm.createQuietHostMonitor({ root: leaseRoot, run_id, run_started_at: runStartIso });
    const requester = { run_id, capability: handle.lease_capability_id };
    const statePath = join(options.evidenceDir, `soak-${options.claimHours}h.json`);
    const openForeign = new Set();

    const monitorTick = () => {
      try {
        const at = iso();
        const s = scanHostRows({ rows: psSnapshot(), loadavg: loadavg(), ncpu, selfPid, heavyCpuThreshold: options.heavyCpuThreshold });
        const obs = monitor.observeHostState({
          at, lease: leaseStore.readLease(leaseRoot), heartbeat: leaseStore.readHeartbeat(leaseRoot),
          currentBootId: identity.boot_id, isAlive: shwl.identity.isProcessAlive, requester, lockPresent: true,
        });
        if (!obs.quiet) ev.intervention("QUIET_HOST_VIOLATION_STATE", { effective: obs.effective, detection: obs.detection });
        const seen = new Set();
        for (const f of s.foreignHeavy) {
          const key = `${f.pid}:${f.cmd.slice(0, 40)}`;
          seen.add(key);
          if (!openForeign.has(key)) {
            openForeign.add(key);
            monitor.prohibitedWorkloadAppeared({ at, op: f.second_soak ? "soak" : "heavy", detail: f, foreign: true });
            ev.intervention("QUIET_HOST_VIOLATION_FOREIGN_WORKLOAD", f);
          }
        }
        for (const key of [...openForeign]) if (!seen.has(key)) { monitor.prohibitedWorkloadCleared({ at, op: "heavy" }); openForeign.delete(key); }
        ev.monSample({ phase: "run", load1: s.load1, ncpu, procs: s.procs, foreign_heavy: s.foreignHeavy, effective: obs.effective, quiet: obs.quiet, quiet_host_eligible: monitor.eligibleNow() });
      } catch (e) { ev.intervention("MONITOR_ERROR", e.message); }
    };
    const heartbeatTick = () => { const r = handle.heartbeat(nowMs()); if (!r.ok) ev.intervention("HEARTBEAT_REFUSED", r); };

    const runSoak = async () => {
      ev.log(`launching soak-run.mjs — claim ${options.claimHours}h, interval ${options.probeIntervalSeconds}s, probe "${options.probe}"`);
      const code = await spawnSoak({ repo: options.repo, options, statePath, onData: (d) => appendFileSync(join(options.evidenceDir, "soak-console.log"), d) });
      if (code !== 0) ev.intervention("SOAK_RUNNER_NONZERO_EXIT", { exitCode: code });
      return code;
    };

    // ACTIVE phase. Production: interval-driven heartbeat + monitor while the soak child runs. Tests:
    // an injected orchestrateActive drives deterministic ticks (e.g. a stale heartbeat) + a fake soak.
    let exitCode;
    if (orchestrateActive) {
      const ctx = { lease_id, run_id, identity, monitor, requester, ev, options, leaseRoot, now, setNow: (fn) => { deps.now = fn; }, };
      exitCode = await orchestrateActive({ monitorTick, heartbeatTick, runSoak, ctx });
    } else {
      const hbTimer = setInterval(heartbeatTick, options.heartbeatEveryMs);
      const monTimer = setInterval(monitorTick, options.monitorEveryMs);
      monitorTick(); // one guaranteed sample at the start of the window
      exitCode = await runSoak();
      clearInterval(hbTimer); clearInterval(monTimer);
    }

    const endIso = iso();

    // STEP 9 — VERDICT from the accumulator AND-gate ONLY.
    const soakState = JSON.parse(readFileSync(statePath, "utf8"));
    const sloResult = soak.slo(soakState);
    const accumulatorPassed = soak.passed(soakState);
    const snap = monitor.snapshot();
    const quietEligible = monitor.eligibleNow() && snap.quiet_host_downgraded === false;

    // run-1 lesson (a): re-freeze the SAME scope, assert manifest_hash unchanged.
    const drift = recheckFreezeDrift({
      repo: options.repo, sha: options.sha, baselineManifestHash: baseline.manifest_hash,
      baselineEntries: baseline.entries, enumerateFiles: freeze.enumerateFiles,
      buildFreezeManifest: freeze.buildFreezeManifest, gitHead, now: iso(),
    });
    if (!drift.ok) ev.intervention("FREEZE_DRIFT", drift);
    else ev.log(`L1 freeze re-verified — NO DRIFT (manifest_hash unchanged, ${drift.files} files)`);

    const accumulatorReport = soak.soakReport(soakState, { sha: options.sha });
    const verdict = computeVerdict({
      options, slo: sloResult, accumulatorPassed, quietEligible, drift, soakState,
      ids: { lease_id, run_id }, caffeine, accumulatorReport,
    });
    ev.writeText("VERDICT.txt", verdict.text);
    ev.log("VERDICT:\n" + verdict.text);

    attestation.appendEvent(attLog, {
      at: endIso,
      payload: {
        kind: "VERDICT", pass: verdict.isPass, verdict_line: verdict.verdictLine,
        span_hours: sloResult.spanHours, claim_hours: options.claimHours, availability: sloResult.availability,
        samples: sloResult.samples, quiet_host_eligible: quietEligible, freeze_ok: drift.ok, reasons: verdict.reasons,
      },
    });

    // STEP 10 — seal + anchor + release.
    attestation.sealRun(attLog, { end_at: endIso, at: endIso });
    sealed = true;
    const entries = attestation.loadEntries(attDir);
    const headHash = entries[entries.length - 1].entry_hash;
    ev.write("attestation-anchor.json", {
      sealed_at: endIso, expectedHeadHash: headHash, expected_head_sha_git: options.sha,
      chain_verdict: attestation.verifyAttestation(entries, { expectedHeadHash: headHash }),
      soak_eligibility: attestation.isSoakEligible(entries, { claimSeconds: options.claimHours * 3600, expectedHeadHash: headHash }),
    });
    ev.write("monitor-snapshot.json", { ...snap, quiet_host_eligible_final: monitor.eligibleNow() });

    safeSealAndRelease(endIso, verdict.isPass ? "SOAK_COMPLETE" : "SOAK_NOT_PASSED");
    ev.log(`DONE — verdict ${verdict.isPass ? "PASS" : "NOT-PASSED"}`);
    return { isPass: verdict.isPass, verdictText: verdict.text, ids: { lease_id, run_id }, reasons: verdict.reasons };
  } catch (e) {
    ev.log("FATAL: " + (e && e.stack ? e.stack : String(e)));
    ev.intervention("FATAL_ERROR", String(e && e.message ? e.message : e));
    safeSealAndRelease(iso(), "ABORTED_ERROR");
    ev.writeText("VERDICT.txt",
      `FOUNDERGATE HARNESS ${options.claimHours}-HOUR SOAK — NOT-PASSED\n\n` +
      `The run did not complete. True reason:\n  ${String(e && e.message ? e.message : e)}\n\n` +
      `SHA under test: ${options.sha}\nstart: ${runStartIso || "NOT STARTED"}\nend: ${iso()}`);
    return { isPass: false, verdictText: "FATAL", ids: {}, reasons: [String(e && e.message ? e.message : e)], error: true };
  }
}

// Wire the REAL accepted modules from the repo (dynamic import; absolute paths). Production only.
export async function loadRepoModules(repo) {
  const [freeze, attestation, shwl, qhm, soak, envProv, launcher, identity, leaseStore, capability] = await Promise.all([
    import(join(repo, "src/freeze-manifest/freeze-manifest.mjs")),
    import(join(repo, "src/run-attestation/index.mjs")),
    import(join(repo, "src/shwl/index.mjs")),
    import(join(repo, "src/quiet-host-monitor/index.mjs")),
    import(join(repo, "src/tools/reliability-soak.mjs")),
    import(join(repo, "src/environment-provenance/capture.mjs")),
    import(join(repo, "src/shwl/launcher.mjs")),
    import(join(repo, "src/shwl/identity.mjs")),
    import(join(repo, "src/shwl/lease-store.mjs")),
    import(join(repo, "src/shwl/capability.mjs")),
  ]);
  return {
    freeze, attestation, shwl, qhm, soak, envProv, capability,
    launchSoak: launcher.launchSoak, captureIdentity: identity.captureIdentity, leaseStore,
  };
}

// =================================================================================================
// CLI — the operator entry point. NOT executed on import (guarded). The operator runs it under
// `caffeinate -dimsu` on the qualifying host. It touches the REAL ~/.cldh lease only when run for
// real — never during tests, which import this module and drive the exported functions on temp roots.
// =================================================================================================
async function cliMain() {
  const options = parseArgs(process.argv);
  const modules = await loadRepoModules(options.repo);
  const result = await runSoakDriver(options, {
    modules,
    leaseRoot: modules.leaseStore.resolveRoot(),
    psSnapshot: realPsSnapshot,
    loadavg: () => os.loadavg()[0],
    ncpu: os.cpus().length,
    selfPid: process.pid,
    now: Date.now,
    spawnSoak: realSpawnSoak,
    gitHead: realGitHead,
    gitDirty: realGitDirty,
  });
  process.exit(result.isPass ? 0 : 2);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  cliMain().catch((e) => { console.error("soak-driver FATAL:", e && e.stack ? e.stack : String(e)); process.exit(1); });
}
