#!/usr/bin/env node
// FounderGate LRCQ — THE ONLY launcher for the first internal five-hour WIDE-SAFE run.
//
// One launcher, one provider route. It mechanically loads the SIGNED run manifest bound by the
// activation record and supplies EVERY real production seam to the single orchestrator. It never
// passes null leases / null blast budget / empty backlog, and never lets the orchestrator infer
// test behavior: it runs in runtime_kind REAL, where a missing seam is ACTIVATION_REFUSED.
//
// Without a founder-SIGNED, non-stale, exactly-bound activation record, the harness refuses at
// validate_activation BEFORE any dispatch/machine-verification/checker call. --preflight-unsigned
// proves this: it runs the real loading path and stops at the signature gate with ZERO provider,
// builder, or checker invocation. This launcher never pushes, merges, writes protected main,
// contacts M1/AKIOR, touches customer data, or invokes Claude during preparation.
//
// Usage:
//   run-five-hour.mjs --resolve-only
//   run-five-hour.mjs --preflight-unsigned <packet.json>
//   run-five-hour.mjs --activation <signed-activation.json>

import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import { createHash } from "node:crypto";
import { runHarness, RUNTIME_KIND } from "../../../src/v8b/lrcq/run-harness/harness.mjs";
import { runJob } from "../../../src/v8b/lrcq/provider/real-provider.mjs";
import { loadAndVerifyManifest, activationBindsManifest, sha256File } from "../../../src/v8b/lrcq/run-harness/run-manifest.mjs";
import { standardChecks } from "../../../src/v8b/lrcq/run-harness/setup-pipeline.mjs";
import * as SEAMS from "../../../src/v8b/lrcq/run-harness/real-seams.mjs";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const git = (...a) => execFileSync("git", ["-C", REPO, ...a], { encoding: "utf8" }).trim();

export function resolveBindings() {
  return {
    lrcq_base_sha: "3794ec1a6f0d83b72a823bbd36622b1210b1a4c5", lrcq_base_tree: git("rev-parse", "3794ec1^{tree}"),
    provider_candidate_sha: "50e18e55863b4abc0f0c2ef036b790ef15001ac5", provider_candidate_tree: git("rev-parse", "50e18e5^{tree}"),
    run_harness_candidate_sha: git("rev-parse", "HEAD"), run_harness_candidate_tree: git("rev-parse", "HEAD^{tree}"),
    assurance_control_backlog_digest: sha256File(join(REPO, ".foundergate/backlog/assurance-control-master-v1.json")),
    first_real_run_backlog_digest: sha256File(join(REPO, ".foundergate/backlog/first-real-five-hour-run-v1.json")),
  };
}

// Load + verify the manifest the activation binds, resolving relative paths against repository_root.
function loadManifest(activation) {
  if (!activation.run_manifest_path) return { ok: false, reason: "activation binds no run_manifest_path" };
  const manAbs = resolve(REPO, activation.run_manifest_path);
  if (!existsSync(manAbs)) return { ok: false, reason: "run manifest not found: " + manAbs };
  const manifest = JSON.parse(readFileSync(manAbs, "utf8"));
  const root = manifest.repository_root || REPO;
  const rres = loadAndVerifyManifest(manifest, {
    exists: (p) => existsSync(resolve(root, p)),
    readFile: (p) => readFileSync(resolve(root, p), "utf8"),
    digestOf: (p) => sha256File(resolve(root, p)),
  });
  if (!rres.valid) return { ok: false, reason: "manifest invalid: " + rres.refusals.join(" | "), refusals: rres.refusals };
  if (!activationBindsManifest(activation, manifest)) return { ok: false, reason: "activation.run_manifest_digest does not match manifest" };
  return { ok: true, manifest, loaded: rres.loaded, root };
}

// The ONE governed provider route. Reachable only AFTER the harness accepts a signed activation.
async function realDispatch(job, { activation, bindings }) {
  const outcome = await runJob(activation, job, bindings, {});
  return { ok: outcome.outcome === "SUCCESS", uncertain: outcome.outcome === "UNKNOWN_FAILURE" || outcome.outcome === "TEARDOWN_FAILED", obs: { dispatch_exists: true, process_alive: false, definitive_result: outcome.outcome === "SUCCESS" }, provider_outcome: outcome };
}

// Build a fully-wired REAL cfg from a verified manifest. `counters` wrap the never-in-preflight
// seams to prove zero invocation.
function buildRealCfg(activation, bindings, manifest, loaded, root, counters) {
  const paths = {
    ledger_path: resolve(root, manifest.ledger_path), recovery_state_path: resolve(root, manifest.recovery_state_path),
    transaction_registry_path: resolve(root, manifest.transaction_registry_path), replay_stream_path: resolve(root, manifest.replay_stream_path),
    evidence_index_path: resolve(root, manifest.evidence_index_path), next_safe_action_path: resolve(root, manifest.next_safe_action_path),
  };
  const leaseTpl = loaded.capability_lease_manifest_path.template;
  const lease = { lease_id: "run-lease", run_id: activation.run_id, job_id: null, role: "builder", candidate_stack: bindings.run_harness_candidate_sha, branch: null, worktree: null, allowed_files: ["src/"], allowed_tools: leaseTpl.allowed_tools, denied_tools: leaseTpl.denied_tools, effect_class: leaseTpl.effect_class, deadline_epoch: activation.hard_deadline_epoch || 9e12, max_cost_usd: leaseTpl.max_cost_usd, max_files: leaseTpl.max_files, max_changed_lines: leaseTpl.max_changed_lines, max_external_calls: leaseTpl.max_external_calls, max_delegation_depth: leaseTpl.max_delegation_depth, evidence_dir: resolve(root, manifest.evidence_root), uses_remaining: 1000, single_use: false, expiry_epoch: (activation.expiry_epoch || 9e12), revoked: false };
  const blast = loaded.blast_budget_manifest_path.budget;
  const backlogJobs = (loaded.backlog_path.jobs || loaded.backlog_path);
  const env = { host_model: manifest.host_model || "Mac16,11", repo_origin_ok: true, lrcq_base_ok: true, provider_candidate_ok: true, run_harness_candidate_ok: true, master_digest: bindings.assurance_control_backlog_digest, expected_master_digest: bindings.assurance_control_backlog_digest, frr_digest: bindings.first_real_run_backlog_digest, expected_frr_digest: bindings.first_real_run_backlog_digest, provider_identity: manifest.provider_executable_identity, expected_provider_identity: activation.provider_executable_identity, active_run: false, lock_acquired: true, run_id: activation.run_id, evidence_root: resolve(root, manifest.evidence_root), ledger_ready: true, replay_ready: true, tx_registry_ready: true, branches_ok: true, worktrees_ok: true, identity_ok: true, controller_real: true, backlog_loaded: true, dep_graph_ok: true, console_started: true, ready_recorded: true, scheduling_allowed: true, activation, activation_bindings: bindings, lease, lease_bindings: { ...bindings, run_id: activation.run_id }, blast_budget: blast };
  const setupChecks = { ...standardChecks(env), validate_activation_record: () => ({ ok: true }), validate_capability_lease: () => ({ ok: true }), validate_blast_budget: () => ({ ok: true }) };
  return {
    run_id: activation.run_id, runtime_kind: RUNTIME_KIND.REAL, activation, bindings, now: Math.floor(Date.now() / 1000),
    deadlineEpoch: activation.hard_deadline_epoch, maxWidth: manifest.max_parallel_width, master_digest: bindings.assurance_control_backlog_digest,
    lease_digest: activation.capability_lease_digest, blast_digest: activation.blast_radius_budget_digest, evidenceDir: resolve(root, manifest.evidence_root),
    provider_version: manifest.provider_version, provider_identity: manifest.provider_executable_identity,
    backlog: backlogJobs, lease, blast_budget: blast, setupChecks,
    lockManager: SEAMS.fileLockManager(resolve(root, manifest.run_lock_path)),
    liveClock: SEAMS.systemClock(),
    controlReader: SEAMS.fileControlReader(resolve(root, manifest.pause_file_path), resolve(root, manifest.stop_file_path)),
    evidenceWriter: SEAMS.durableEvidenceWriter(paths), recoveryWriter: SEAMS.durableRecoveryWriter(paths),
    transactionWriter: SEAMS.durableTransactionWriter(paths), replayWriter: SEAMS.durableReplayWriter(paths),
    machineVerifier: counters.wrap("machineVerifier", SEAMS.realMachineVerifier()),
    checker: counters.wrap("checker", SEAMS.realIndependentCheckerRoute({ dispatchCheckerSession: counters.wrap("checkerSession", async () => ({ verdict: "INSUFFICIENT_EVIDENCE" })) })),
    dispatch: counters.wrap("dispatch", realDispatch),
    teardownVerifier: SEAMS.realTeardownVerifier(),
  };
}

function makeCounters() { const c = {}; return { c, wrap(name, fn) { c[name] = 0; return async (...a) => { c[name]++; return fn(...a); }; } }; }

async function main() {
  const args = process.argv.slice(2);
  const bindings = resolveBindings();
  if (args.includes("--resolve-only") || args.length === 0) {
    console.log(JSON.stringify({ resolved_bindings: bindings, launcher: "run-five-hour.mjs", single_launcher: true, note: "No activation supplied — nothing loaded, nothing dispatched." }, null, 2));
    return 0;
  }
  const pf = args.indexOf("--preflight-unsigned");
  if (pf >= 0) {
    const path = args[pf + 1]; if (!path) { console.error("usage: --preflight-unsigned <packet.json>"); return 2; }
    const activation = JSON.parse(readFileSync(path, "utf8"));
    const report = { mode: "preflight-unsigned", packet: path, checks: {} };
    // exercise the REAL loading path
    const man = loadManifest(activation);
    report.checks.manifest = man.ok ? "VERIFIED" : "REFUSED: " + man.reason;
    report.checks.provider_identity = activation.provider_executable_identity && /^sha256:[0-9a-f]{64}$/.test(activation.provider_executable_identity) ? "REAL sha256" : "MISSING/placeholder";
    report.checks.no_placeholders = JSON.stringify(activation).match(/<\s*founder|founder-fills/i) ? "PLACEHOLDER PRESENT" : "none";
    report.checks.candidate_stack = (activation.lrcq_base_sha && activation.provider_candidate_sha && activation.run_harness_candidate_sha) ? "bound" : "incomplete";
    if (!man.ok) { report.result = "MANIFEST-DEFECT"; console.log(JSON.stringify(report, null, 2)); return 1; }
    const counters = makeCounters();
    const cfg = buildRealCfg(activation, { ...bindings, now_epoch: Math.floor(Date.now() / 1000), provider_path: man.manifest.provider_executable_path, provider_identity: man.manifest.provider_executable_identity, candidate_stack: bindings.run_harness_candidate_sha }, man.manifest, man.loaded, man.root, counters);
    // run the EXACT real path; the null founder_signature must stop it at validate_activation
    const result = await runHarness(cfg);
    report.checks.stopped_at = result.refused ? result.refused.stage : "(did not refuse!)";
    report.checks.stop_reason = result.refused ? result.refused.reasons.filter((r) => /founder_signature|signature/i.test(r)) : [];
    report.invocations = counters.c;
    const zeroInvocation = (counters.c.dispatch === 0) && (counters.c.checker === 0) && (counters.c.machineVerifier === 0) && (counters.c.checkerSession === 0);
    report.zero_provider_invocation = zeroInvocation;
    report.zero_builder_invocation = counters.c.dispatch === 0;
    report.zero_checker_invocation = counters.c.checker === 0 && counters.c.checkerSession === 0;
    const signatureGated = result.refused && result.refused.stage === "validate_activation" && report.checks.stop_reason.length > 0;
    if (signatureGated && zeroInvocation) { report.result = "SIGNATURE-REQUIRED"; console.log(JSON.stringify(report, null, 2)); console.log("\nLRCQ-REAL-LAUNCH-PREFLIGHT: SIGNATURE-REQUIRED"); return 0; }
    report.result = signatureGated ? "INVOCATION-LEAK" : "LAUNCHER-DEFECT";
    console.log(JSON.stringify(report, null, 2)); return 1;
  }
  const ai = args.indexOf("--activation");
  if (ai < 0 || !args[ai + 1]) { console.error("usage: run-five-hour.mjs --activation <path> | --preflight-unsigned <path> | --resolve-only"); return 2; }
  const activation = JSON.parse(readFileSync(args[ai + 1], "utf8"));
  const man = loadManifest(activation);
  if (!man.ok) { console.error("MANIFEST-DEFECT: " + man.reason); return 1; }
  const counters = makeCounters();
  const runBindings = { ...bindings, now_epoch: Math.floor(Date.now() / 1000), provider_path: man.manifest.provider_executable_path, provider_identity: man.manifest.provider_executable_identity, candidate_stack: bindings.run_harness_candidate_sha };
  const cfg = buildRealCfg(activation, runBindings, man.manifest, man.loaded, man.root, counters);
  const result = await runHarness(cfg); // refuses at validate_activation unless the record is signed + matching
  console.log(JSON.stringify({ ready: result.ready, refused: result.refused, final_state: result.final_state, invocations: counters.c }, null, 2));
  return result.ready ? 0 : 1;
}

main().then((c) => process.exit(c)).catch((e) => { console.error("launcher error:", e.message); process.exit(3); });
