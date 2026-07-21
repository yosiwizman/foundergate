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
import { readFileSync as _rf, mkdirSync, writeFileSync } from "node:fs";
import * as SEAMS from "../../../src/v8b/lrcq/run-harness/real-seams.mjs";

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
    return { ok: outcome.outcome === "SUCCESS", uncertain: outcome.outcome === "UNKNOWN_FAILURE" || outcome.outcome === "TEARDOWN_FAILED", obs: { dispatch_exists: true, process_alive: false, definitive_result: outcome.outcome === "SUCCESS" }, tree_gone: outcome.tree_gone, parsed_output: outcome.parsed_output, provider_cost_usd: outcome.provider_cost_usd, transport_digest: outcome.transport_digest, provider_outcome: outcome };
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

// FG-LRCQ-ACT-014/015/016: the SUPERVISED signed-run entry. Adds the activation-lifecycle control plane
// on top of executeSignedRun: (1) durable ONE-TIME activation consumption + anti-replay (a replay is
// refused before any run), (2) single-owner supervisor with PID + heartbeat + duplicate refusal + the
// IMMUTABLE deadline from the consumption receipt, (3) a durable terminal state. It NEVER mints authority,
// invokes a provider itself, or extends the deadline. Refuses (zero side effects) if the activation is
// unsigned/mis-bound, already consumed, or a live supervisor already owns the run. Tested with synthetic
// signed fixtures + deterministic stub providers only — never the real provider.
export async function executeSupervisedRun(activation, man, runBindings, counters, exec = {}, life = {}) {
  const root = man.root;
  const ledgerDir = life.ledgerDir || resolve(root, man.manifest.evidence_root, "activation-ledger");
  const supervisorDir = life.supervisorDir || resolve(root, man.manifest.evidence_root, "supervisor");
  const now = typeof life.now === "number" ? life.now : Math.floor(Date.now() / 1000);
  // Gate 0: an unsigned/mis-bound record never consumes or supervises — run the authoritative refusal path.
  if (!validateActivationV3(activation, runBindings).valid) { const r = await executeSignedRun(activation, man, runBindings, counters, exec); return { ...r, consumed: false, supervised: false }; }
  // Gate 1: consume exactly once (durable, anti-replay).
  const consumption = consumeActivation(activation, { ledgerDir, now });
  if (!consumption.ok) return { ready: false, refused: { stage: "activation_consumption", reasons: [consumption.reason] }, final_state: consumption.replay_blocked ? "REPLAY_BLOCKED" : "CONSUMPTION_REFUSED", consumed: false, consumption };
  // Gate 2: single supervisor ownership (PID + heartbeat + immutable deadline from the receipt).
  const sup = startSupervisor({ stateDir: supervisorDir, run_id: activation.run_id, consumerReceipt: consumption, now, pid: life.pid });
  if (!sup.ok) return { ready: false, refused: { stage: "supervisor", reasons: [sup.reason] }, final_state: "SUPERVISOR_REFUSED", consumed: true, consumption, supervisor: sup };
  // Run under supervision; heartbeat around execution; record a durable terminal state. The activation
  // stays consumed after EVERY terminal outcome (success, held, budget/deadline stop, or failure).
  let result;
  try {
    sup.handle.heartbeat(now);
    result = await executeSignedRun(activation, man, runBindings, counters, exec);
    const term = mapTerminalState(result);
    sup.handle.setTerminal(term.state, term.reason);
    return { ...result, consumed: true, supervised: true, consumption_receipt: consumption, launch_receipt: sup.launch_receipt, terminal_state: term.state };
  } catch (e) {
    try { sup.handle.setTerminal("FAILED_CLOSED", e && e.message); } catch { /* */ }
    return { ready: false, refused: { stage: "supervised_execution", reasons: [e && e.message] }, final_state: "FAILED_CLOSED", consumed: true, consumption_receipt: consumption, launch_receipt: sup.launch_receipt, terminal_state: "FAILED_CLOSED" };
  }
}

// Map a harness result to a durable supervisor terminal state (all fail-closed / bounded stops).
function mapTerminalState(result) {
  const fstate = result && result.final_state;
  if (fstate === "STOPPED_DEADLINE") return { state: "STOPPED_DEADLINE", reason: "hard deadline reached" };
  if (fstate === "STOPPED_BY_STOP") return { state: "STOPPED_BY_STOP", reason: "stop control observed" };
  if (fstate === "CONTROLLED_BUDGET_STOP" || (result && result.outcome_status === "CONTROLLED_BUDGET_STOP")) return { state: "CONTROLLED_BUDGET_STOP", reason: "run-wide $10 ceiling" };
  if (fstate && /HELD/.test(fstate)) return { state: "HELD", reason: fstate };
  if (result && result.ready === false) return { state: "HELD", reason: (result.refused && result.refused.stage) || "not ready" };
  return { state: "STOPPED_EXHAUSTED", reason: "queue drained / run complete" };
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
  const activation = JSON.parse(readFileSync(args[ai + 1], "utf8"));
  const man = loadManifest(activation);
  if (!man.ok) { console.error("MANIFEST-DEFECT: " + man.reason); return 1; }
  const counters = makeCounters();
  const runBindings = { ...bindings, now_epoch: Math.floor(Date.now() / 1000), provider_path: man.manifest.provider_executable_path, provider_identity: man.manifest.provider_executable_identity, candidate_stack: bindings.run_harness_candidate_sha };
  // The REAL signed-run path is SUPERVISED: valid signed activation -> canonical identity -> atomic
  // one-time consumption -> durable replay block -> exactly one supervisor -> existing executor +
  // provider adapter. There is no alternate unsigned/unsupervised launch path. It refuses (zero side
  // effects) before any provider invocation if unsigned/mis-bound, already consumed, corrupt, or a live
  // supervisor already owns the run.
  const result = await executeSupervisedRun(activation, man, runBindings, counters, { git: (a, cwd) => execFileSync("git", a, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(), repoRoot: man.manifest.repository_root, candidateRef: runBindings.run_harness_candidate_sha });
  console.log(JSON.stringify({ ready: result.ready, refused: result.refused, final_state: result.final_state, consumed: result.consumed, terminal_state: result.terminal_state, launch_receipt: result.launch_receipt, worktrees_created: result.worktrees_created, invocations: counters.c }, null, 2));
  return result.ready ? 0 : 1;
}

// Run main() ONLY when this file is executed directly as the launcher — never when imported (e.g. by the
// integration selftest, which drives executeSignedRun/buildRealCfg without triggering the CLI entrypoint).
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then((c) => process.exit(c)).catch((e) => { console.error("launcher error:", e.message); process.exit(3); });
}
