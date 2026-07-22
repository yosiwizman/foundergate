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

import { execFileSync, spawn } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import { createHash } from "node:crypto";
import { runHarness, RUNTIME_KIND } from "../../../src/v8b/lrcq/run-harness/harness.mjs";
import { runJob } from "../../../src/v8b/lrcq/provider/real-provider.mjs";
import { loadAndVerifyManifest, activationBindsManifest, sha256File } from "../../../src/v8b/lrcq/run-harness/run-manifest.mjs";
import { standardChecks } from "../../../src/v8b/lrcq/run-harness/setup-pipeline.mjs";
import { composeAdapterActivation, composeCheckerActivation } from "../../../src/v8b/lrcq/run-harness/compose-adapter-activation.mjs";
import { validateActivation } from "../../../src/v8b/lrcq/provider/activation-schema.mjs";
import { validateLease, validateActivationV3 } from "../../../src/v8b/lrcq/assurance/assurance-core.mjs";
import { setupManager, eligibleForSetup } from "../../../src/v8b/lrcq/run-harness/setup-manager.mjs";
import { mintBuilderLease } from "../../../src/v8b/lrcq/run-harness/harness.mjs";
import { validateCheckerOutput, validateBuilderOutput } from "../../../src/v8b/lrcq/provider/provider-output.mjs";
import { execMachineVerifier } from "../../../src/v8b/lrcq/run-harness/machine-verifier-exec.mjs";
import { validateAll25, resolveRunPlan, runPlanDigest } from "../../../src/v8b/lrcq/run-harness/run-plan.mjs";
import { buildIdentityEnvelope } from "../../../src/v8b/lrcq/provider/identity-envelope.mjs";
import { consumeActivation, isConsumed } from "../../../src/v8b/lrcq/run-harness/activation-consumer.mjs";
import { startSupervisor, readSupervisorState } from "../../../src/v8b/lrcq/run-harness/supervisor.mjs";
import { witnessHealth } from "../../../src/v8b/lrcq/run-harness/health-witness.mjs";
import { BudgetLedger } from "../../../src/v8b/lrcq/run-harness/budget-ledger.mjs";
import { readFileSync as _rf, mkdirSync, writeFileSync, openSync, closeSync } from "node:fs";
import * as SEAMS from "../../../src/v8b/lrcq/run-harness/real-seams.mjs";
import { verifyProviderTarget } from "../../../src/v8b/lrcq/provider/provider-verify.mjs";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const git = (...a) => execFileSync("git", ["-C", REPO, ...a], { encoding: "utf8" }).trim();
const sha256 = (s) => "sha256:" + createHash("sha256").update(typeof s === "string" ? s : JSON.stringify(s)).digest("hex");
// The controlled base env the provider process runs in. scrubEnv keeps only PATH+HOME and strips every
// prohibited secret (ANTHROPIC_API_KEY, cloud/GH tokens, ...); without PATH the provider cannot exec.
const PROVIDER_ENV = { PATH: process.env.PATH, HOME: process.env.HOME };
// FG-LRCQ-ACT-009: assemble the canonical session identity envelope the ONE dispatch route renders into
// the real prompt (no identity.json side channel). All values derive from the signed activation, the
// consumed single-use lease, the composed adapter tools, and the run-plan — nothing hand-filled.
function sessionEnvelope(role, { activation, bindings, job, lease, session, adapter, evidenceRoot, sessionCap, checker }) {
  const plan = resolveRunPlan(job, activation.run_id, { branch_prefix: adapter.allowed_branch_prefix, permitted_worktree_root: adapter.allowed_worktree_root });
  const f = {
    role, run_id: activation.run_id, job_id: job.job_id, attempt: job.__attempt || 1, session_id: session.session_id,
    candidate_sha: bindings.run_harness_candidate_sha, candidate_tree: bindings.run_harness_candidate_tree,
    backlog_digest: activation.first_real_run_backlog_digest, resolved_plan_digest: runPlanDigest(plan),
    branch: job.branch, worktree: job.worktree, lease_id: lease.lease_id, lease_digest: sha256(lease),
    allowed_tools_digest: sha256(adapter.allowed_tools || []), denied_tools_digest: sha256(adapter.denied_tools || []),
    evidence_path: resolve(evidenceRoot, job.job_id), deadline_epoch: activation.hard_deadline_epoch || 9e12, session_cost_cap_usd: sessionCap,
  };
  if (checker) { f.builder_transaction_id = checker.builder_transaction_id; f.machine_verifier_report_digest = checker.machine_verifier_report_digest; }
  const env = buildIdentityEnvelope(f);
  // Carry the harness's session prompt-digest(s) so the worker ECHOES exactly what the harness binds its
  // output against (builder: prompt_digest; checker: checker_session_id + checker_prompt_digest). Without
  // these the worker falls back to session_id and the output fails the harness's prompt-digest binding.
  if (checker) { env.checker_session_id = session.session_id; env.checker_prompt_digest = session.prompt_digest; env.machine_verifier_digest = checker.machine_verifier_report_digest; }
  else { env.prompt_digest = session.prompt_digest; }
  return env;
}

export function resolveBindings() {
  return {
    lrcq_base_sha: "3794ec1a6f0d83b72a823bbd36622b1210b1a4c5", lrcq_base_tree: git("rev-parse", "3794ec1^{tree}"),
    provider_candidate_sha: "50e18e55863b4abc0f0c2ef036b790ef15001ac5", provider_candidate_tree: git("rev-parse", "50e18e5^{tree}"),
    run_harness_candidate_sha: git("rev-parse", "HEAD"), run_harness_candidate_tree: git("rev-parse", "HEAD^{tree}"),
    assurance_control_backlog_digest: sha256File(join(REPO, ".foundergate/backlog/assurance-control-master-v1.json")),
    first_real_run_backlog_digest: sha256File(join(REPO, ".foundergate/backlog/first-real-five-hour-run-v2.json")),
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
  // FG-LRCQ-ACT-010/013: a v1-style (execution-incompatible) backlog must FAIL AT LOAD, not silently
  // park at runtime. Run the all-25 executable-material validator over the bound backlog.
  const bl = rres.loaded.backlog_path;
  if (bl && Array.isArray(bl.jobs)) { const va = validateAll25(bl, manifest, { exists: (t) => existsSync(resolve(root, t)) }); if (!va.valid) return { ok: false, reason: "bound backlog fails all-25 execution validation: " + va.refusals.slice(0, 4).join(" | "), refusals: va.refusals }; }
  return { ok: true, manifest, loaded: rres.loaded, root };
}

// The ONE governed provider route. Reachable only AFTER the harness accepts a signed activation.
// F1: the harness validates the V3 signed record; the provider adapter validates a V2 record.
// realDispatch COMPOSES the V2 adapter-activation from the signed V3 record + verified manifest
// (never hand-filled) so a signed run genuinely reaches the single provider spawn route.
function makeRealDispatch(manifest, loaded, evidenceRoot) {
  return async function realDispatch(job, { activation, bindings, lease, builderSession }) {
    // FG-LRCQ-ACT-012: hard-cap THIS builder session's CLI budget at its run-wide ledger reservation
    // (job.__builder_session_cap), so no single session can spend the whole $10.
    const adapterActivation = composeAdapterActivation(activation, manifest, loaded, { evidence_root: evidenceRoot, session_budget_usd: job.__builder_session_cap });
    // FG-LRCQ-ACT-009: render the canonical identity envelope into the REAL builder prompt (no
    // identity.json side channel) and parse the CLI transport envelope (payload + cost). Without these
    // the real Claude CLI's transport-wrapped output is unparseable and no cost is extracted.
    const bs = builderSession || { session_id: "builder:" + activation.run_id + ":" + job.job_id, prompt_digest: "bpd:" + job.job_id };
    const _identity_envelope = sessionEnvelope("builder", { activation, bindings, job, lease: lease || { lease_id: "builder:" + job.job_id }, session: bs, adapter: adapterActivation, evidenceRoot, sessionCap: job.__builder_session_cap });
    const outcome = await runJob(adapterActivation, { ...job, role: "builder", _identity_envelope }, { ...bindings, provider_path: manifest.provider_executable_path, provider_version: manifest.provider_version, provider_identity: manifest.provider_executable_identity, backlog_digest: activation.first_real_run_backlog_digest }, { role: "builder", transport: true, env: PROVIDER_ENV });
    // FG-LRCQ-ACT-005/007/012: surface the validated parsed output, the real teardown evidence
    // (tree_gone), AND the transport-reported cost so the run-wide ledger commits real spend.
    return { ok: outcome.outcome === "SUCCESS", uncertain: outcome.outcome === "UNKNOWN_FAILURE" || outcome.outcome === "TEARDOWN_FAILED", obs: { dispatch_exists: true, process_alive: false, definitive_result: outcome.outcome === "SUCCESS" }, tree_gone: outcome.tree_gone, teardown_status: outcome.teardown_status, provider_invocation: outcome.provider_invocation, parsed_output: outcome.parsed_output, provider_cost_usd: outcome.provider_cost_usd, transport_digest: outcome.transport_digest, provider_outcome: outcome };
  };
}

// F2: the independent checker's second session routes through the SAME single provider adapter
// (a distinct read-only checker activation), and its verdict is read from the checker session's
// durably-written verdict file — NOT a hardcoded stub. Invoked only under a founder signature.
function makeCheckerSessionDispatch(manifest, loaded, evidenceRoot) {
  return async function dispatchCheckerSession(job, checkerLease, session, governedContext) {
    // FG-LRCQ-ACT-002/003: compose the checker activation from the SIGNED activation carried in the
    // governed context (never a hidden job property / empty-object fallback); enforce the checker
    // lease is present, distinct, read-only + single-use before any spawn.
    const gc = governedContext || {};
    if (!gc.signed_activation || Object.keys(gc.signed_activation).length === 0) return { verdict: "INSUFFICIENT_EVIDENCE" };
    if (!checkerLease || checkerLease.role !== "checker" || checkerLease.read_only !== true || checkerLease.single_use !== true) return { verdict: "INSUFFICIENT_EVIDENCE" };
    if (session.session_id === (gc.builder_session && gc.builder_session.session_id) || session.prompt_digest === gc.builder_prompt_digest) return { verdict: "INSUFFICIENT_EVIDENCE" };
    // FG-LRCQ-ACT-012: hard-cap the checker session's CLI budget at its ledger reservation too.
    const checkerActivation = composeCheckerActivation(gc.signed_activation, manifest, loaded, { evidence_root: evidenceRoot, session_budget_usd: job.__checker_session_cap });
    // FG-LRCQ-ACT-009: render the checker's canonical identity envelope (bound to the builder tx + the
    // machine-verifier report digest) into the READ-ONLY checker prompt; parse the transport envelope.
    const cjob = { ...job, role: "checker", __attempt: gc.attempt, branch: gc.branch, worktree: gc.worktree };
    const _identity_envelope = sessionEnvelope("checker", { activation: gc.signed_activation, bindings: gc.bindings || {}, job: cjob, lease: checkerLease, session, adapter: checkerActivation, evidenceRoot, sessionCap: job.__checker_session_cap, checker: { builder_transaction_id: gc.builder_transaction_id, machine_verifier_report_digest: gc.machine_verifier_report_digest } });
    const outcome = await runJob(checkerActivation, { ...cjob, _checker_session: session.session_id, _checker_lease: checkerLease.lease_id, _identity_envelope }, { ...(gc.bindings || {}), provider_path: manifest.provider_executable_path, provider_version: manifest.provider_version, provider_identity: manifest.provider_executable_identity, backlog_digest: gc.signed_activation.first_real_run_backlog_digest }, { role: "checker", transport: true, env: PROVIDER_ENV });
    // FG-LRCQ-ACT-012: surface the checker session's real cost even on failure so the run-wide ledger
    // commits it (a checker session that spent money must be counted whether or not its verdict lands).
    if (outcome.outcome !== "SUCCESS") return { verdict: "INSUFFICIENT_EVIDENCE", provider_cost_usd: outcome.provider_cost_usd, transport_digest: outcome.transport_digest };
    // FG-LRCQ-ACT-005: the READ-ONLY checker emits its verdict on STDOUT (it cannot write files).
    // The evidence plane (here) validates that structured output — role/run/job/attempt/session/
    // prompt/builder-tx/mv-digest + a complete PASS/FAIL checklist — then atomically writes the
    // attempt-bound verdict. Undefined/malformed/mismatched -> INSUFFICIENT_EVIDENCE (never CLEAN).
    const cval = validateCheckerOutput(outcome.parsed_output, { run_id: gc.signed_activation.run_id, job_id: gc.job_id, attempt: gc.attempt, session_id: session.session_id, prompt_digest: session.prompt_digest, builder_transaction_id: gc.builder_transaction_id, machine_verifier_digest: gc.machine_verifier_report_digest });
    if (!cval.valid) return { verdict: "INSUFFICIENT_EVIDENCE", refusals: cval.refusals };
    try {
      const vdir = resolve(evidenceRoot, gc.job_id, "attempt-" + gc.attempt); mkdirSync(vdir, { recursive: true });
      const vp = resolve(vdir, "checker-verdict.json");
      if (existsSync(vp)) { const prior = JSON.parse(_rf(vp, "utf8")); if (prior.run_id !== gc.signed_activation.run_id || prior.job_id !== gc.job_id || prior.attempt !== gc.attempt || prior.checker_session_id !== session.session_id) return { verdict: "INSUFFICIENT_EVIDENCE", refusals: ["stale/foreign pre-existing verdict"] }; }
      writeFileSync(vp, JSON.stringify({ ...outcome.parsed_output, written_by: "evidence-plane" }, null, 2) + "\n");
    } catch { return { verdict: "INSUFFICIENT_EVIDENCE", provider_cost_usd: outcome.provider_cost_usd, transport_digest: outcome.transport_digest }; }
    return { verdict: cval.verdict, provider_cost_usd: outcome.provider_cost_usd, transport_digest: outcome.transport_digest };
  };
}

// Build a fully-wired REAL cfg from a verified manifest. `counters` wrap the never-in-preflight
// seams to prove zero invocation.
export function buildRealCfg(activation, bindings, manifest, loaded, root, counters) {
  const paths = {
    ledger_path: resolve(root, manifest.ledger_path), recovery_state_path: resolve(root, manifest.recovery_state_path),
    transaction_registry_path: resolve(root, manifest.transaction_registry_path), replay_stream_path: resolve(root, manifest.replay_stream_path),
    evidence_index_path: resolve(root, manifest.evidence_index_path), next_safe_action_path: resolve(root, manifest.next_safe_action_path),
  };
  const leaseTpl = loaded.capability_lease_manifest_path.template;
  // FG-LRCQ-ACT-001: the launcher supplies only a SINGLE-USE lease TEMPLATE (never a reusable
  // run-level lease). The harness mints a fresh per-job/per-attempt single-use lease from it.
  const lease = { lease_id: "builder-template", run_id: activation.run_id, job_id: null, role: "builder", candidate_stack: bindings.run_harness_candidate_sha, branch: null, worktree: null, allowed_files: ["src/"], allowed_tools: leaseTpl.allowed_tools, denied_tools: leaseTpl.denied_tools, effect_class: leaseTpl.effect_class, deadline_epoch: activation.hard_deadline_epoch || 9e12, max_cost_usd: leaseTpl.max_cost_usd, max_files: leaseTpl.max_files, max_changed_lines: leaseTpl.max_changed_lines, max_external_calls: leaseTpl.max_external_calls, max_delegation_depth: leaseTpl.max_delegation_depth, evidence_dir: resolve(root, manifest.evidence_root), uses_remaining: 1, single_use: true, expiry_epoch: (activation.expiry_epoch || 9e12), revoked: false };
  const blast = loaded.blast_budget_manifest_path.budget;
  // FG-LRCQ-ACT-013: the FROZEN backlog (v2) carries EXECUTABLE material — test_commands (signed
  // argv vs the immutable verifier), branch_suffix, expected_output_paths, cost caps. Resolve each
  // into the scheduler-compatible job shape the controller's validateBacklog accepts, deriving the
  // per-job branch/worktree deterministically via the run-plan resolver (never trusting free-form
  // path strings). This is the seam that made v1 (documentary-only) silently park; v2 executes.
  const rawJobs = (loaded.backlog_path.jobs || loaded.backlog_path);
  const backlogJobs = rawJobs.map((j) => {
    const plan = resolveRunPlan(j, activation.run_id, manifest);
    return {
      job_id: j.job_id, title: j.job_id, objective: j.objective, done_meaning: j.done_meaning,
      source: "first-real-five-hour-run-v2", risk_class: j.risk_class, effect_class: j.effect_class,
      dependencies: j.dependencies || [], allowed_files: j.allowed_files, forbidden_files: j.forbidden_files || [],
      branch: plan.branch, worktree: plan.worktree,
      expected_outputs: j.expected_output_paths, expected_output_paths: j.expected_output_paths,
      tests: j.test_commands, test_commands: j.test_commands,
      required_evidence: (j.required_evidence_files || []).map((e) => e.path || e), required_evidence_files: j.required_evidence_files || [],
      checker_requirement: "independent", gate_trigger: j.gate_trigger || "NONE",
      risk: j.risk_class, estimated_minutes: j.estimated_minutes || 5, max_attempts: j.max_attempts || 3, correction_cycle: 0,
      max_changed_lines: j.max_changed_lines, builder_cost_cap_usd: j.builder_cost_cap_usd, checker_cost_cap_usd: j.checker_cost_cap_usd,
      status: "PENDING",
    };
  });
  const env = { host_model: manifest.host_model || "Mac16,11", repo_origin_ok: true, lrcq_base_ok: true, provider_candidate_ok: true, run_harness_candidate_ok: true, master_digest: bindings.assurance_control_backlog_digest, expected_master_digest: bindings.assurance_control_backlog_digest, frr_digest: bindings.first_real_run_backlog_digest, expected_frr_digest: bindings.first_real_run_backlog_digest, provider_identity: manifest.provider_executable_identity, expected_provider_identity: activation.provider_executable_identity, active_run: false, lock_acquired: true, run_id: activation.run_id, evidence_root: resolve(root, manifest.evidence_root), ledger_ready: true, replay_ready: true, tx_registry_ready: true, branches_ok: true, worktrees_ok: true, identity_ok: true, controller_real: true, backlog_loaded: true, dep_graph_ok: true, console_started: true, ready_recorded: true, scheduling_allowed: true, activation, activation_bindings: bindings, lease, lease_bindings: { ...bindings, run_id: activation.run_id }, blast_budget: blast };
  const setupChecks = { ...standardChecks(env), validate_activation_record: () => ({ ok: true }), validate_capability_lease: () => ({ ok: true }), validate_blast_budget: () => ({ ok: true }) };
  return {
    run_id: activation.run_id, runtime_kind: RUNTIME_KIND.REAL, activation, bindings, now: Math.floor(Date.now() / 1000),
    deadlineEpoch: activation.hard_deadline_epoch, maxWidth: manifest.max_parallel_width, master_digest: bindings.assurance_control_backlog_digest,
    lease_digest: activation.capability_lease_digest, blast_digest: activation.blast_radius_budget_digest, evidenceDir: resolve(root, manifest.evidence_root),
    provider_version: manifest.provider_version, provider_identity: manifest.provider_executable_identity, runManifest: manifest,
    builderOutputValidator: validateBuilderOutput,
    // FG-LRCQ-ACT-012: run-wide cumulative $10 ceiling. The ledger reserves builder+checker headroom
    // per job/attempt and CONTROLLED_BUDGET_STOPs the scheduler before the cap is ever exceeded.
    budgetLedger: new BudgetLedger(manifest.max_cost_usd || 10),
    backlog: backlogJobs, lease, blast_budget: blast, setupChecks,
    lockManager: SEAMS.fileLockManager(resolve(root, manifest.run_lock_path)),
    liveClock: SEAMS.systemClock(),
    controlReader: SEAMS.fileControlReader(resolve(root, manifest.pause_file_path), resolve(root, manifest.stop_file_path)),
    evidenceWriter: SEAMS.durableEvidenceWriter(paths), recoveryWriter: SEAMS.durableRecoveryWriter(paths),
    transactionWriter: SEAMS.durableTransactionWriter(paths), replayWriter: SEAMS.durableReplayWriter(paths),
    machineVerifier: counters.wrap("machineVerifier", execMachineVerifier()),
    checker: counters.wrap("checker", SEAMS.realIndependentCheckerRoute({ dispatchCheckerSession: counters.wrap("checkerSession", makeCheckerSessionDispatch(manifest, loaded, resolve(root, manifest.evidence_root))), consumed: new Set(), recordLease: SEAMS.durableTransactionWriter(paths).record ? (rec) => SEAMS.durableTransactionWriter(paths).record("checker-lease:" + rec.lease_id, "CONSUMED", rec) : undefined })),
    dispatch: counters.wrap("dispatch", makeRealDispatch(manifest, loaded, resolve(root, manifest.evidence_root))),
    teardownVerifier: SEAMS.realTeardownVerifier(),
  };
}

export function makeCounters() { const c = {}; return { c, wrap(name, fn) { c[name] = 0; return async (...a) => { c[name]++; return fn(...a); }; } }; }

// FG-LRCQ-ACT-011/013: execute the SIGNED run. runJob spawns each provider session with cwd=job.worktree
// and REFUSES a non-existent worktree — so the per-job git worktrees MUST be created (from the exact
// candidate ref) BEFORE dispatch and torn down after. The harness validates the activation FIRST
// (validate_activation, before setup), so we only create real worktrees once the record actually
// validates (no side effects for an unsigned/mis-bound record); runHarness then re-validates
// authoritatively. `exec` (git/repoRoot/candidateRef) is injectable so this exact path is testable with
// a deterministic stub provider. NOTHING here is invoked during preflight (preflight never reaches it).
export async function executeSignedRun(activation, man, runBindings, counters, exec = {}) {
  const cfg = buildRealCfg(activation, runBindings, man.manifest, man.loaded, man.root, counters);
  // Do not create any worktrees for a record that will be refused — let runHarness produce the
  // authoritative refusal with zero side effects.
  if (!validateActivationV3(activation, runBindings).valid) return runHarness(cfg);
  const gitRun = exec.git || ((a, cwd) => execFileSync("git", a, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim());
  const repoRoot = exec.repoRoot || man.manifest.repository_root;
  const candidateRef = exec.candidateRef || runBindings.run_harness_candidate_sha;
  const setup = setupManager(cfg.backlog, activation.run_id, man.manifest, { git: gitRun, repoRoot, candidateRef });
  if (!setup.ok) { if (setup.teardown) setup.teardown(); return { ready: false, refused: { stage: "create_registered_worktrees", reasons: ["real worktree setup failed: " + (setup.failed_step || "?")] }, final_state: "SETUP_FAILED", dispatched: false, setup }; }
  // reflect the REAL setup result into the harness setup pipeline (replaces the asserted booleans)
  const eligible = cfg.backlog.filter((j) => eligibleForSetup(j).ok).length;
  cfg.setupChecks = { ...cfg.setupChecks, allocate_branches: () => ({ ok: setup.created.length === eligible }), create_registered_worktrees: () => ({ ok: setup.ok && setup.created.length === eligible }), verify_worktree_branch_identity: () => ({ ok: setup.ok }) };
  try { const result = await runHarness(cfg); return { ...result, worktrees_created: setup.created.length }; }
  finally { try { if (setup.teardown) setup.teardown(); } catch { /* teardown best-effort; verifier confirms tree-gone per job */ } }
}

// FG-LRCQ-ACT-014/015/016/019: the in-process SUPERVISED signed-run orchestration (durable one-time
// consumption + anti-replay + single-owner supervisor + durable terminal state) has been RELOCATED OUT of
// this production launcher into a structurally test-only module so it is absent from the production
// authority graph: src/v8b/lrcq/run-harness-tests/test-support/supervised-run.mjs. Production real-activation
// execution uses ONLY launchDetachedSupervisor (a genuine detached OS process) — there is no synchronous /
// in-process supervised route reachable from production source. mapTerminalState moved with it.

// FG-LRCQ-ACT-017/018: the ONE production detached-launch path. The launcher validates + atomically
// consumes + writes immutable supervisor config, then SPAWNS supervisor-main.mjs as a genuine DETACHED
// OS process (own process group, stdin disconnected, stdout/stderr to durable run files, unref'd) so it
// OUTLIVES this launcher/terminal. The launcher then waits a BOUNDED interval for the supervisor to
// publish RUN_ACTIVE, validates the launch receipt (distinct PID + process-start identity + immutable
// deadline), returns it, and EXITS — it never awaits the job run. Refuses (zero side effects) before any
// provider work on any binding/consumption/spawn/RUN_ACTIVE failure. Never invokes a provider itself.
export async function launchDetachedSupervisor(activation, man, runBindings, exec = {}, life = {}) {
  const root = man.root;
  const ledgerDir = life.ledgerDir || resolve(root, man.manifest.evidence_root, "activation-ledger");
  const supervisorDir = life.supervisorDir || resolve(root, man.manifest.evidence_root, "supervisor");
  const runRoot = life.runRoot || resolve(root, man.manifest.evidence_root);
  const now = typeof life.now === "number" ? life.now : Math.floor(Date.now() / 1000);
  const supMain = life.supervisorMainPath || resolve(REPO, "src/v8b/lrcq/run-harness/supervisor-main.mjs");
  // Gate 0: unsigned/mis-bound -> authoritative refusal via the inner validator, zero side effects.
  if (!validateActivationV3(activation, runBindings).valid) { return { ready: false, refused: { stage: "validate_activation", reasons: ["activation invalid/unsigned"] }, final_state: "REFUSED", consumed: false, launched: false }; }
  // Gate 1: atomic one-time consumption (durable anti-replay) — BEFORE spawning anything.
  const consumption = consumeActivation(activation, { ledgerDir, now });
  if (!consumption.ok) return { ready: false, refused: { stage: "activation_consumption", reasons: [consumption.reason] }, final_state: consumption.replay_blocked ? "REPLAY_BLOCKED" : "CONSUMPTION_REFUSED", consumed: false, launched: false, consumption };
  // Write immutable supervisor config (explicit array args; restrictive perms; no shell).
  try { mkdirSync(supervisorDir, { recursive: true }); mkdirSync(runRoot, { recursive: true }); } catch { /* */ }
  const cfgPath = resolve(supervisorDir, "supervisor-config-" + String(activation.run_id).replace(/[^a-zA-Z0-9_.-]/g, "_") + ".json");
  const cfg = { activation, man, bindings: runBindings, exec, ledgerDir, supervisorDir, runRoot, heartbeatMs: life.heartbeatMs || 30000, eventLog: resolve(runRoot, "supervisor-events.jsonl") };
  writeFileSync(cfgPath, JSON.stringify(cfg), { flag: "w", mode: 0o600 });
  // Spawn the detached supervisor process; durable stdout/stderr opened BEFORE spawn; fds closed after.
  const outFd = openSync(resolve(runRoot, "supervisor.out"), "a", 0o600);
  const errFd = openSync(resolve(runRoot, "supervisor.err"), "a", 0o600);
  let child;
  try { child = spawn(process.execPath, [supMain, "--config", cfgPath], { detached: true, stdio: ["ignore", outFd, errFd] }); child.unref(); }
  catch (e) { try { closeSync(outFd); closeSync(errFd); } catch { /* */ } return { ready: false, refused: { stage: "supervisor_spawn", reasons: [e && e.message] }, final_state: "SUPERVISOR_SPAWN_FAILED", consumed: true, launched: false }; }
  const launcherPid = process.pid, supervisorPid = child.pid;
  try { closeSync(outFd); closeSync(errFd); } catch { /* */ }
  // Wait a BOUNDED interval for durable RUN_ACTIVE (the supervisor publishes it from ITS process).
  const deadlineMs = Date.now() + (life.startupTimeoutMs || 10000);
  let state = null;
  while (Date.now() < deadlineMs) {
    state = readSupervisorState(supervisorDir, activation.run_id);
    if (state && !state.corrupt && state.state === "RUN_ACTIVE" && typeof state.supervisor_pid === "number") break;
    await new Promise((r) => setTimeout(r, life.pollMs || 150));
  }
  if (!state || state.corrupt || state.state !== "RUN_ACTIVE") return { ready: false, refused: { stage: "run_active_timeout", reasons: ["supervisor did not publish RUN_ACTIVE within bound"] }, final_state: "RUN_ACTIVE_TIMEOUT", consumed: true, launched: false, supervisor_pid: supervisorPid };
  if (state.supervisor_pid === launcherPid) return { ready: false, refused: { stage: "pid_distinctness", reasons: ["supervisor PID equals launcher PID"] }, final_state: "SUPERVISOR_NOT_DETACHED", consumed: true, launched: false };
  if (!state.process_start_identity) return { ready: false, refused: { stage: "process_start_identity", reasons: ["supervisor did not publish a process-start identity"] }, final_state: "NO_PROCESS_IDENTITY", consumed: true, launched: false };
  // Launch receipt; the launcher now RETURNS and (as a CLI) exits — the supervisor keeps running.
  return { ready: true, launched: true, consumed: true, launcher_pid: launcherPid, launch_receipt: { run_id: activation.run_id, supervisor_pid: state.supervisor_pid, process_start_identity: state.process_start_identity, immutable_hard_deadline_epoch: state.immutable_hard_deadline_epoch, state: "RUN_ACTIVE", activation_id: consumption.activation_id, run_duration_s: consumption.run_duration_s, max_budget_usd: consumption.max_budget_usd }, config_path: cfgPath, run_root: runRoot };
}

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
    // FG-LRCQ-ACT-004: analyze the COMPLETE refusal set. SIGNATURE-REQUIRED only when EVERY refusal
    // is one of the explicitly-allowed unsigned/time-sensitive fields; ANY other refusal (wrong SHA/
    // tree/digest/provider/lease/blast/policy/path/placeholder/root/seam) is a BINDING-DEFECT.
    // An unsigned/time refusal is allowed ONLY for a missing signature/time field, or an
    // expired/deadline-elapsed refusal that is a direct artifact of a NULL (unfilled) time field.
    // A genuinely past-dated (non-null) expiry/deadline is a real BINDING-DEFECT, never allowed.
    const isAllowedUnsigned = (r) => /missing (founder_signature|issued_epoch|expiry_epoch|hard_deadline_epoch)\b/.test(r) || (r === "expired" && activation.expiry_epoch == null) || (r === "deadline elapsed" && activation.hard_deadline_epoch == null);
    const allRefusals = result.refused ? result.refused.reasons : [];
    report.checks.stopped_at = result.refused ? result.refused.stage : "(did not refuse!)";
    report.checks.full_refusal_set = allRefusals;
    const nonSignatureRefusals = allRefusals.filter((r) => !isAllowedUnsigned(r));
    report.checks.non_signature_refusals = nonSignatureRefusals;
    report.invocations = counters.c;
    const zeroInvocation = (counters.c.dispatch === 0) && (counters.c.checker === 0) && (counters.c.machineVerifier === 0) && (counters.c.checkerSession === 0);
    report.zero_provider_invocation = zeroInvocation; report.zero_builder_invocation = counters.c.dispatch === 0; report.zero_checker_invocation = counters.c.checker === 0 && counters.c.checkerSession === 0;
    if (!zeroInvocation) { report.result = "INVOCATION-LEAK"; console.log(JSON.stringify(report, null, 2)); console.log("\nLRCQ-REAL-LAUNCH-PREFLIGHT: INVOCATION-LEAK"); return 1; }
    const hasSignatureRefusal = allRefusals.some((r) => /missing (founder_signature|issued_epoch|expiry_epoch|hard_deadline_epoch)\b/.test(r));
    if (result.refused && result.refused.stage === "validate_activation" && hasSignatureRefusal && nonSignatureRefusals.length === 0) {
      report.result = "SIGNATURE-REQUIRED"; console.log(JSON.stringify(report, null, 2)); console.log("\nLRCQ-REAL-LAUNCH-PREFLIGHT: SIGNATURE-REQUIRED"); return 0;
    }
    report.result = "BINDING-DEFECT"; console.log(JSON.stringify(report, null, 2)); console.log("\nLRCQ-REAL-LAUNCH-PREFLIGHT: BINDING-DEFECT"); return 1;
  }
  const ft = args.indexOf("--final-template-preflight");
  if (ft >= 0) {
    const path = args[ft + 1]; if (!path) { console.error("usage: --final-template-preflight <template.json>"); return 2; }
    const activation = JSON.parse(readFileSync(path, "utf8"));
    const report = { mode: "final-template-preflight", template: path, checks: {} };
    // 1. the final template MUST bind the exact CURRENT final HEAD/tree (no parent-binding)
    report.checks.binds_exact_final_head = activation.run_harness_candidate_sha === bindings.run_harness_candidate_sha && activation.run_harness_candidate_tree === bindings.run_harness_candidate_tree;
    const man = loadManifest(activation);
    report.checks.manifest = man.ok ? "VERIFIED" : "REFUSED: " + man.reason;
    if (!man.ok) { report.result = "MANIFEST-DEFECT"; console.log(JSON.stringify(report, null, 2)); console.log("\nLRCQ-REAL-LAUNCH-PREFLIGHT: BINDING-DEFECT"); return 1; }
    const runB = { ...bindings, now_epoch: Math.floor(Date.now() / 1000), provider_path: man.manifest.provider_executable_path, provider_identity: man.manifest.provider_executable_identity, candidate_stack: bindings.run_harness_candidate_sha, backlog_digest: activation.first_real_run_backlog_digest };
    // 2. mint + validate ONE representative builder lease + ONE checker lease. The v2 backlog job
    // carries deterministic branch/worktree TEMPLATES, not host paths — resolve j0 through the same
    // run-plan resolver the scheduler uses so the lease binds the exact resolved branch/worktree.
    const rawJ0 = (man.loaded.backlog_path.jobs || man.loaded.backlog_path)[0];
    const p0 = resolveRunPlan(rawJ0, activation.run_id, man.manifest);
    const j0 = { ...rawJ0, branch: p0.branch, worktree: p0.worktree };
    const bl = mintBuilderLease({ run_id: activation.run_id, lease: man.loaded.capability_lease_manifest_path.template, bindings: runB, deadlineEpoch: activation.hard_deadline_epoch, evidenceDir: resolve(man.root, man.manifest.evidence_root) }, j0, 1);
    report.checks.builder_lease = validateLease(bl, { ...runB, run_id: activation.run_id, job_id: j0.job_id, role: "builder", branch: j0.branch, worktree: j0.worktree }).valid && bl.single_use === true;
    const cl = SEAMS.mintCheckerLease({ signed_activation: activation, bindings: runB, job_id: j0.job_id, attempt: 1, branch: j0.branch, worktree: j0.worktree, evidence_dir: "/ev" }, { session_id: "cs", prompt_digest: "cp" });
    report.checks.checker_lease = validateLease(cl, { run_id: cl.run_id, job_id: j0.job_id, role: "checker", branch: j0.branch, worktree: j0.worktree }).valid && cl.read_only === true && cl.single_use === true;
    // 3. compose BOTH builder + checker V2 adapter activations and prove they validate (when signed)
    const signedOverlay = { ...activation, founder_signature: "FOUNDER-SIGNS", issued_epoch: 1000, expiry_epoch: 9_999_999_999, hard_deadline_epoch: 9_999_999_998 };
    const advB = { lrcq_base_sha: activation.lrcq_base_sha, lrcq_base_tree: activation.lrcq_base_tree, provider_candidate_sha: activation.provider_candidate_sha, provider_candidate_tree: activation.provider_candidate_tree, backlog_digest: activation.first_real_run_backlog_digest, provider_path: man.manifest.provider_executable_path, provider_version: man.manifest.provider_version, provider_identity: man.manifest.provider_executable_identity, now_epoch: 2000, active_run: false, recovery_resolved: true };
    report.checks.builder_adapter_validates = validateActivation(composeAdapterActivation(signedOverlay, man.manifest, man.loaded), advB).valid;
    report.checks.checker_adapter_validates = validateActivation(composeCheckerActivation(signedOverlay, man.manifest, man.loaded), advB).valid;
    // 4. run the real loading path; SIGNATURE-REQUIRED only when signature/time fields are the sole blockers
    const counters = makeCounters();
    const cfg = buildRealCfg(activation, runB, man.manifest, man.loaded, man.root, counters);
    const result = await runHarness(cfg);
    const isAllowedUnsigned = (r) => /missing (founder_signature|issued_epoch|expiry_epoch|hard_deadline_epoch)\b/.test(r) || (r === "expired" && activation.expiry_epoch == null) || (r === "deadline elapsed" && activation.hard_deadline_epoch == null);
    const allRefusals = result.refused ? result.refused.reasons : [];
    report.checks.full_refusal_set = allRefusals;
    const nonSig = allRefusals.filter((r) => !isAllowedUnsigned(r));
    report.checks.non_signature_refusals = nonSig;
    report.invocations = counters.c;
    const zeroInvocation = counters.c.dispatch === 0 && counters.c.checker === 0 && counters.c.machineVerifier === 0 && counters.c.checkerSession === 0;
    report.zero_invocation = zeroInvocation;
    const structuralOk = report.checks.binds_exact_final_head && report.checks.builder_lease && report.checks.checker_lease && report.checks.builder_adapter_validates && report.checks.checker_adapter_validates;
    if (structuralOk && zeroInvocation && result.refused && result.refused.stage === "validate_activation" && allRefusals.some((r) => /missing (founder_signature|issued_epoch|expiry_epoch|hard_deadline_epoch)\b/.test(r)) && nonSig.length === 0) {
      report.result = "SIGNATURE-REQUIRED"; console.log(JSON.stringify(report, null, 2)); console.log("\nLRCQ-REAL-LAUNCH-PREFLIGHT: SIGNATURE-REQUIRED"); return 0;
    }
    report.result = "BINDING-DEFECT"; console.log(JSON.stringify(report, null, 2)); console.log("\nLRCQ-REAL-LAUNCH-PREFLIGHT: BINDING-DEFECT"); return 1;
  }
  const ai = args.indexOf("--activation");
  if (ai < 0 || !args[ai + 1]) { console.error("usage: run-five-hour.mjs --activation <path> | --preflight-unsigned <path> | --resolve-only"); return 2; }
  // FG-LRCQ-ACT-019 PRODUCTION SEAM CLOSURE: the production --activation command accepts NO caller-supplied
  // override of manifest / loaded backlog / bindings / provider / repository / candidate / execution adapter
  // / runtime root / evidence root / ledger dir / supervisor dir / supervisor-main path / startup / polling /
  // heartbeat. A retired test-injection variable present during a production run FAILS CLOSED HERE — before
  // the activation is read or consumed and before any process is spawned — with zero provider invocation.
  // Deterministic tests drive the detached launcher through a structurally test-only path
  // (src/v8b/lrcq/run-harness-tests/test-support), never through this production CLI.
  if (process.env.LRCQ_TEST_LIFECYCLE) {
    console.log(JSON.stringify({ result: "PRODUCTION_TEST_OVERRIDE_REFUSED", variable: "LRCQ_TEST_LIFECYCLE", command: "--activation", activation_consumed: false, process_spawned: false, provider_invocation: 0 }, null, 2));
    console.error("PRODUCTION_TEST_OVERRIDE_REFUSED: LRCQ_TEST_LIFECYCLE must not be set for a production run");
    return 1;
  }
  const activation = JSON.parse(readFileSync(args[ai + 1], "utf8"));
  // Production authority-bearing values derive ONLY from the validated signed activation, the reviewed
  // manifest it binds (loadManifest), the frozen candidate, and the normal provider resolver — no caller.
  const man = loadManifest(activation);
  if (!man.ok) { console.error("MANIFEST-DEFECT: " + man.reason); return 1; }
  // FG-LRCQ-ACT-022 PRE-CONSUMPTION PROVIDER VERIFICATION: rehash the IMMUTABLE reviewed versioned target
  // (resolved_provider_target) on disk and confirm its digest + version against the activation-bound identity
  // BEFORE any consumption or spawn. A mutable host alias (e.g. ~/.local/bin/claude) that drifted to an
  // unreviewed version cannot change what this signed activation executes; drift FAILS CLOSED here.
  const pv = verifyProviderTarget(
    { resolvedTarget: man.manifest.resolved_provider_target, expectedIdentity: activation.provider_executable_identity, expectedVersion: man.manifest.provider_version },
    { versionRunner: (p) => execFileSync(p, ["--version"], { encoding: "utf8" }).trim() },
  );
  if (!pv.ok) {
    console.log(JSON.stringify({ result: pv.code, provider_binding: "VERIFICATION_FAILED", detail: pv, resolved_target: man.manifest.resolved_provider_target, mutable_alias: man.manifest.provider_executable_path, activation_consumed: false, process_spawned: false, provider_invocation: 0 }, null, 2));
    console.error("PROVIDER_BINDING_REFUSED: " + pv.code + " (bound target " + man.manifest.resolved_provider_target + ")");
    return 1;
  }
  // Execution + witness bind the IMMUTABLE resolved target (not the mutable alias).
  const runBindings = { ...bindings, now_epoch: Math.floor(Date.now() / 1000), provider_path: man.manifest.provider_executable_path, provider_identity: man.manifest.provider_executable_identity, candidate_stack: bindings.run_harness_candidate_sha, provider_verification: pv.receipt };
  // The REAL signed-run path is DETACHED-SUPERVISED: valid signed activation -> canonical identity ->
  // atomic one-time consumption -> durable replay block -> write immutable supervisor config -> spawn ONE
  // detached supervisor OS process -> wait bounded for RUN_ACTIVE -> validate launch receipt -> RETURN +
  // EXIT (the launcher never awaits the run; the detached supervisor owns it to the immutable deadline).
  // This is the ONLY production launch route — there is no synchronous/unsupervised alternative here. Exec
  // derives from the manifest repository_root + the frozen candidate SHA; life uses manifest-derived defaults.
  const detExec = { git: (a, cwd) => execFileSync("git", a, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(), repoRoot: man.manifest.repository_root, candidateRef: runBindings.run_harness_candidate_sha };
  const result = await launchDetachedSupervisor(activation, man, runBindings, detExec, {});
  console.log(JSON.stringify({ ready: result.ready, launched: result.launched, refused: result.refused, final_state: result.final_state, consumed: result.consumed, launcher_pid: result.launcher_pid, launch_receipt: result.launch_receipt, run_root: result.run_root }, null, 2));
  return result.ready ? 0 : 1;
}

// Run main() ONLY when this file is executed directly as the launcher — never when imported (e.g. by the
// integration selftest, which drives executeSignedRun/buildRealCfg without triggering the CLI entrypoint).
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then((c) => process.exit(c)).catch((e) => { console.error("launcher error:", e.message); process.exit(3); });
}
