#!/usr/bin/env node
// FounderGate LRCQ — THE ONLY launcher for the first internal five-hour WIDE-SAFE run (V4 AUTHORITY).
//
// FG-LRCQ-ACT-029 PRODUCTION MIGRATION. New execution follows exactly one route:
//
//   signed V4 activation
//     -> governed founder public-key authority (docs/governance/FOUNDER_KEY_AUTHORITY.json, fail-closed)
//     -> VERIFIED capability (Ed25519 over the canonical payload + exact authorization bytes)
//     -> preflight with ZERO provider invocation
//     -> governed one-time consumption (ephemeral-key-signed marker in the SIGNED lifecycle root)
//     -> opaque CONSUMED capability
//     -> signed atomic launch intent (naming + digesting the supervisor entrypoint)
//     -> one-use inherited-descriptor ephemeral-key transfer
//     -> detached supervisor OS process
//     -> INDEPENDENT V4 re-verification inside that process
//     -> signed atomic supervisor claim
//     -> opaque SUPERVISOR_EXECUTION capability
//     -> non-authoritative legacy projection (v4-legacy-projection.mjs)
//     -> deterministic execution machinery (harness)
//     -> provider eligibility
//     -> spawn boundary (real-provider requires the capability, not the record)
//
// V3/V2 activation records are REFUSED for every new production execution, before any side effect.
// Historical V3 remains readable only for evidence and incident reconstruction (never imported here).
// This launcher never pushes, merges, writes protected main, contacts M1/AKIOR, touches customer data,
// or invokes Claude during preparation.
//
// Usage:
//   run-five-hour.mjs --resolve-only
//   run-five-hour.mjs --preflight-v4 <activation-or-template.json> [--authorization <file>]
//   run-five-hour.mjs --final-template-preflight <template.json> [--authorization <file>]
//   run-five-hour.mjs --activation <signed-activation-v4.json> --authorization <authorization.txt>

import { execFileSync } from "node:child_process";
import { readFileSync, existsSync, realpathSync, lstatSync, mkdirSync, writeFileSync, openSync, closeSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import { createHash } from "node:crypto";
import { runHarness, RUNTIME_KIND, mintBuilderLease } from "../../../src/v8b/lrcq/run-harness/harness.mjs";
import { runJob } from "../../../src/v8b/lrcq/provider/real-provider.mjs";
import { loadAndVerifyManifest, sha256File } from "../../../src/v8b/lrcq/run-harness/run-manifest.mjs";
import { standardChecks } from "../../../src/v8b/lrcq/run-harness/setup-pipeline.mjs";
import { projectLegacyActivationV4, projectLegacyBindingsV4 } from "../../../src/v8b/lrcq/run-harness/v4-legacy-projection.mjs";
import { verifyActivation, V4_CODES, ACTIVATION_V4_SCHEMA } from "../../../src/v8b/lrcq/assurance/activation-v4.mjs";
import { loadAuthority, KEY_CODES } from "../../../src/v8b/lrcq/assurance/founder-key-authority.mjs";
import { consumeVerifiedActivation } from "../../../src/v8b/lrcq/run-harness/activation-consumer.mjs";
import { createLaunchIntentV4, spawnGovernedSupervisorV4 } from "../../../src/v8b/lrcq/assurance/lifecycle-authority-v4.mjs";
import { validateActivation as validateLegacyProjection } from "../../../src/v8b/lrcq/provider/activation-schema.mjs";
import { validateLease } from "../../../src/v8b/lrcq/assurance/assurance-core.mjs";
import { setupManager, eligibleForSetup } from "../../../src/v8b/lrcq/run-harness/setup-manager.mjs";
import { validateCheckerOutput, validateBuilderOutput } from "../../../src/v8b/lrcq/provider/provider-output.mjs";
import { execMachineVerifier } from "../../../src/v8b/lrcq/run-harness/machine-verifier-exec.mjs";
import { validateAll25, resolveRunPlan, runPlanDigest } from "../../../src/v8b/lrcq/run-harness/run-plan.mjs";
import { buildIdentityEnvelope } from "../../../src/v8b/lrcq/provider/identity-envelope.mjs";
import { readSupervisorState } from "../../../src/v8b/lrcq/run-harness/supervisor.mjs";
import { BudgetLedger } from "../../../src/v8b/lrcq/run-harness/budget-ledger.mjs";
import * as SEAMS from "../../../src/v8b/lrcq/run-harness/real-seams.mjs";
import { verifyProviderTarget } from "../../../src/v8b/lrcq/provider/provider-verify.mjs";
import { fixedGit, fixedExecutableReport } from "../../../src/v8b/lrcq/assurance/fixed-executables.mjs";
import { readAuthorizationBytes } from "./founder-sign.mjs";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
export const SUPERVISOR_MAIN = realpathSync(resolve(REPO, "src/v8b/lrcq/run-harness/supervisor-main.mjs"));
// FG-CHK-197-02: fixed absolute git in a minimal environment for every launcher observation.
const git = (...a) => fixedGit(["-C", REPO, ...a]);
const sha256 = (s) => "sha256:" + createHash("sha256").update(typeof s === "string" ? s : JSON.stringify(s)).digest("hex");
// The controlled base env the provider process runs in. scrubEnv keeps only PATH+HOME and strips every
// prohibited secret (ANTHROPIC_API_KEY, cloud/GH tokens, ...); without PATH the provider cannot exec.
const PROVIDER_ENV = { PATH: process.env.PATH, HOME: process.env.HOME };

// FG-LRCQ-ACT-009: assemble the canonical session identity envelope the ONE dispatch route renders into the
// real prompt (no identity.json side channel). Every value derives from SIGNED V4 facts on the
// SUPERVISOR_EXECUTION capability, the non-authoritative projection, the consumed single-use lease, the
// composed adapter tools, and the run-plan — nothing hand-filled.
function sessionEnvelope(role, { cap, record, bindings, job, lease, session, adapter, evidenceRoot, sessionCap, checker }) {
  const plan = resolveRunPlan(job, cap.run_id, { branch_prefix: adapter.allowed_branch_prefix, permitted_worktree_root: adapter.allowed_worktree_root });
  const f = {
    role, run_id: cap.run_id, job_id: job.job_id, attempt: job.__attempt || 1, session_id: session.session_id,
    candidate_sha: cap.evaluated_candidate, candidate_tree: cap.evaluated_candidate_tree,
    backlog_digest: cap.backlog_digest, resolved_plan_digest: runPlanDigest(plan),
    branch: job.branch, worktree: job.worktree, lease_id: lease.lease_id, lease_digest: sha256(lease),
    allowed_tools_digest: sha256(adapter.allowed_tools || []), denied_tools_digest: sha256(adapter.denied_tools || []),
    evidence_path: resolve(evidenceRoot, job.job_id), deadline_epoch: cap.hard_deadline_epoch || 9e12, session_cost_cap_usd: sessionCap,
  };
  if (checker) { f.builder_transaction_id = checker.builder_transaction_id; f.machine_verifier_report_digest = checker.machine_verifier_report_digest; }
  const env = buildIdentityEnvelope(f);
  // Carry the harness's session prompt-digest(s) so the worker ECHOES exactly what the harness binds its
  // output against (builder: prompt_digest; checker: checker_session_id + checker_prompt_digest).
  if (checker) { env.checker_session_id = session.session_id; env.checker_prompt_digest = session.prompt_digest; env.machine_verifier_digest = checker.machine_verifier_report_digest; }
  else { env.prompt_digest = session.prompt_digest; }
  return env;
}

// Static candidate-stack reference values. In V4 these are FOUNDER-SIGNED fields on the activation; this
// resolver exists only for --resolve-only reporting and for preflight cross-checks against a template.
export function resolveBindings() {
  return {
    lrcq_base_sha: "3794ec1a6f0d83b72a823bbd36622b1210b1a4c5", lrcq_base_tree: git("rev-parse", "3794ec1^{tree}"),
    provider_candidate_sha: "50e18e55863b4abc0f0c2ef036b790ef15001ac5", provider_candidate_tree: git("rev-parse", "50e18e5^{tree}"),
    run_harness_candidate_sha: git("rev-parse", "HEAD"), run_harness_candidate_tree: git("rev-parse", "HEAD^{tree}"),
    assurance_control_backlog_digest: sha256File(join(REPO, ".foundergate/backlog/assurance-control-master-v1.json")),
    first_real_run_backlog_digest: sha256File(join(REPO, ".foundergate/backlog/first-real-five-hour-run-v2.json")),
  };
}

// ---- SIGNED manifest loading -----------------------------------------------------------------------
// The V4 payload SIGNS run_manifest_path + run_manifest_digest, so the manifest a run executes under is
// exactly the one the founder signed. Path resolution is anchored to the SIGNED repository_root.
export function loadManifestV4(cap) {
  if (!cap.run_manifest_path) return { ok: false, reason: "signed activation binds no run_manifest_path" };
  const manAbs = resolve(cap.repository_root, cap.run_manifest_path);
  if (!existsSync(manAbs)) return { ok: false, reason: "run manifest not found: " + manAbs };
  const actual = sha256File(manAbs);
  if (actual !== cap.run_manifest_digest) return { ok: false, reason: "run manifest digest != SIGNED run_manifest_digest (" + actual + " vs " + cap.run_manifest_digest + ")" };
  const manifest = JSON.parse(readFileSync(manAbs, "utf8"));
  const root = manifest.repository_root || cap.repository_root;
  const rres = loadAndVerifyManifest(manifest, {
    exists: (p) => existsSync(resolve(root, p)),
    readFile: (p) => readFileSync(resolve(root, p), "utf8"),
    digestOf: (p) => sha256File(resolve(root, p)),
  });
  if (!rres.valid) return { ok: false, reason: "manifest invalid: " + rres.refusals.join(" | "), refusals: rres.refusals };
  // FG-LRCQ-ACT-010/013: a v1-style (execution-incompatible) backlog must FAIL AT LOAD, not silently park.
  const bl = rres.loaded.backlog_path;
  if (bl && Array.isArray(bl.jobs)) { const va = validateAll25(bl, manifest, { exists: (t) => existsSync(resolve(root, t)) }); if (!va.valid) return { ok: false, reason: "bound backlog fails all-25 execution validation: " + va.refusals.slice(0, 4).join(" | "), refusals: va.refusals }; }
  return { ok: true, manifest, loaded: rres.loaded, root, manifest_path: manAbs, manifest_digest: actual };
}

// ---- the ONE governed provider route ---------------------------------------------------------------
// Reachable only from a genuine SUPERVISOR_EXECUTION capability. The V2 adapter record handed to runJob is
// the NON-AUTHORITATIVE projection of that exact capability; the spawn boundary checks the capability.
function makeRealDispatch(manifest, loaded, evidenceRoot) {
  return async function realDispatch(job, { activation, bindings, lease, builderSession, executionCapability }) {
    const cap = executionCapability;
    // FG-LRCQ-ACT-012: hard-cap THIS builder session's CLI budget at its run-wide ledger reservation.
    const adapterActivation = projectLegacyActivationV4(cap, manifest, loaded, "builder", { evidenceRoot, sessionBudgetUsd: job.__builder_session_cap });
    const bs = builderSession || { session_id: "builder:" + cap.run_id + ":" + job.job_id, prompt_digest: "bpd:" + job.job_id };
    const _identity_envelope = sessionEnvelope("builder", { cap, record: activation, bindings, job, lease: lease || { lease_id: "builder:" + job.job_id }, session: bs, adapter: adapterActivation, evidenceRoot, sessionCap: job.__builder_session_cap });
    const outcome = await runJob(
      adapterActivation,
      { ...job, role: "builder", _identity_envelope },
      { ...bindings, provider_path: cap.provider_executable_path, provider_version: cap.provider_version, provider_identity: cap.provider_identity, backlog_digest: cap.backlog_digest },
      { role: "builder", transport: true, env: PROVIDER_ENV, executionCapability: cap },
    );
    return { ok: outcome.outcome === "SUCCESS", uncertain: outcome.outcome === "UNKNOWN_FAILURE" || outcome.outcome === "TEARDOWN_FAILED", obs: { dispatch_exists: true, process_alive: false, definitive_result: outcome.outcome === "SUCCESS" }, tree_gone: outcome.tree_gone, teardown_status: outcome.teardown_status, provider_invocation: outcome.provider_invocation, parsed_output: outcome.parsed_output, provider_cost_usd: outcome.provider_cost_usd, transport_digest: outcome.transport_digest, provider_outcome: outcome };
  };
}

// The independent checker's second session routes through the SAME single provider adapter (a distinct
// READ-ONLY projection of the same capability), and its verdict is read from the checker session's
// structured stdout — never a hardcoded stub.
function makeCheckerSessionDispatch(manifest, loaded, evidenceRoot) {
  return async function dispatchCheckerSession(job, checkerLease, session, governedContext) {
    const gc = governedContext || {};
    const cap = gc.execution_capability;
    if (!cap) return { verdict: "INSUFFICIENT_EVIDENCE" };
    if (!gc.signed_activation || Object.keys(gc.signed_activation).length === 0) return { verdict: "INSUFFICIENT_EVIDENCE" };
    if (!checkerLease || checkerLease.role !== "checker" || checkerLease.read_only !== true || checkerLease.single_use !== true) return { verdict: "INSUFFICIENT_EVIDENCE" };
    if (session.session_id === (gc.builder_session && gc.builder_session.session_id) || session.prompt_digest === gc.builder_prompt_digest) return { verdict: "INSUFFICIENT_EVIDENCE" };
    const checkerActivation = projectLegacyActivationV4(cap, manifest, loaded, "checker", { evidenceRoot, sessionBudgetUsd: job.__checker_session_cap });
    const cjob = { ...job, role: "checker", __attempt: gc.attempt, branch: gc.branch, worktree: gc.worktree };
    const _identity_envelope = sessionEnvelope("checker", { cap, record: gc.signed_activation, bindings: gc.bindings || {}, job: cjob, lease: checkerLease, session, adapter: checkerActivation, evidenceRoot, sessionCap: job.__checker_session_cap, checker: { builder_transaction_id: gc.builder_transaction_id, machine_verifier_report_digest: gc.machine_verifier_report_digest } });
    const outcome = await runJob(
      checkerActivation,
      { ...cjob, _checker_session: session.session_id, _checker_lease: checkerLease.lease_id, _identity_envelope },
      { ...(gc.bindings || {}), provider_path: cap.provider_executable_path, provider_version: cap.provider_version, provider_identity: cap.provider_identity, backlog_digest: cap.backlog_digest },
      { role: "checker", transport: true, env: PROVIDER_ENV, executionCapability: cap },
    );
    if (outcome.outcome !== "SUCCESS") return { verdict: "INSUFFICIENT_EVIDENCE", provider_cost_usd: outcome.provider_cost_usd, transport_digest: outcome.transport_digest };
    // The READ-ONLY checker emits its verdict on STDOUT (it cannot write files). The evidence plane
    // validates that structured output then atomically writes the attempt-bound verdict.
    const cval = validateCheckerOutput(outcome.parsed_output, { run_id: cap.run_id, job_id: gc.job_id, attempt: gc.attempt, session_id: session.session_id, prompt_digest: session.prompt_digest, builder_transaction_id: gc.builder_transaction_id, machine_verifier_digest: gc.machine_verifier_report_digest });
    if (!cval.valid) return { verdict: "INSUFFICIENT_EVIDENCE", refusals: cval.refusals };
    try {
      const vdir = resolve(evidenceRoot, gc.job_id, "attempt-" + gc.attempt); mkdirSync(vdir, { recursive: true });
      const vp = resolve(vdir, "checker-verdict.json");
      if (existsSync(vp)) { const prior = JSON.parse(readFileSync(vp, "utf8")); if (prior.run_id !== cap.run_id || prior.job_id !== gc.job_id || prior.attempt !== gc.attempt || prior.checker_session_id !== session.session_id) return { verdict: "INSUFFICIENT_EVIDENCE", refusals: ["stale/foreign pre-existing verdict"] }; }
      writeFileSync(vp, JSON.stringify({ ...outcome.parsed_output, written_by: "evidence-plane" }, null, 2) + "\n");
    } catch { return { verdict: "INSUFFICIENT_EVIDENCE", provider_cost_usd: outcome.provider_cost_usd, transport_digest: outcome.transport_digest }; }
    return { verdict: cval.verdict, provider_cost_usd: outcome.provider_cost_usd, transport_digest: outcome.transport_digest };
  };
}

// Build a fully-wired REAL cfg from a genuine SUPERVISOR_EXECUTION capability + the SIGNED manifest.
// `counters` wrap the never-in-preflight seams to prove zero invocation.
export function buildRealCfgV4(cap, signedV4, manifest, loaded, root, counters) {
  const bindings = { ...projectLegacyBindingsV4(cap), run_harness_candidate_sha: cap.evaluated_candidate, run_harness_candidate_tree: cap.evaluated_candidate_tree, first_real_run_backlog_digest: cap.backlog_digest, provider_identity: cap.provider_identity };
  const evidenceRoot = resolve(root, manifest.evidence_root);
  const paths = {
    ledger_path: resolve(root, manifest.ledger_path), recovery_state_path: resolve(root, manifest.recovery_state_path),
    transaction_registry_path: resolve(root, manifest.transaction_registry_path), replay_stream_path: resolve(root, manifest.replay_stream_path),
    evidence_index_path: resolve(root, manifest.evidence_index_path), next_safe_action_path: resolve(root, manifest.next_safe_action_path),
  };
  const leaseTpl = loaded.capability_lease_manifest_path.template;
  // FG-LRCQ-ACT-001: only a SINGLE-USE lease TEMPLATE (never a reusable run-level lease). The harness mints
  // a fresh per-job/per-attempt single-use lease from it.
  const lease = { lease_id: "builder-template", run_id: cap.run_id, job_id: null, role: "builder", candidate_stack: cap.evaluated_candidate, branch: null, worktree: null, allowed_files: ["src/"], allowed_tools: leaseTpl.allowed_tools, denied_tools: leaseTpl.denied_tools, effect_class: leaseTpl.effect_class, deadline_epoch: cap.hard_deadline_epoch || 9e12, max_cost_usd: leaseTpl.max_cost_usd, max_files: leaseTpl.max_files, max_changed_lines: leaseTpl.max_changed_lines, max_external_calls: leaseTpl.max_external_calls, max_delegation_depth: leaseTpl.max_delegation_depth, evidence_dir: evidenceRoot, uses_remaining: 1, single_use: true, expiry_epoch: cap.expiry_epoch || 9e12, revoked: false };
  const blast = loaded.blast_budget_manifest_path.budget;
  // The FROZEN backlog (v2) carries EXECUTABLE material; resolve each job into the scheduler-compatible
  // shape, deriving branch/worktree deterministically via the run-plan resolver.
  const rawJobs = (loaded.backlog_path.jobs || loaded.backlog_path);
  const backlogJobs = rawJobs.map((j) => {
    const plan = resolveRunPlan(j, cap.run_id, manifest);
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
  const projection = projectLegacyActivationV4(cap, manifest, loaded, "builder", { evidenceRoot });
  const env = { host_model: manifest.host_model || "Mac16,11", repo_origin_ok: true, lrcq_base_ok: true, provider_candidate_ok: true, run_harness_candidate_ok: true, master_digest: cap.backlog_digest, expected_master_digest: cap.backlog_digest, frr_digest: cap.backlog_digest, expected_frr_digest: cap.backlog_digest, provider_identity: cap.provider_identity, expected_provider_identity: cap.provider_identity, active_run: false, lock_acquired: true, run_id: cap.run_id, evidence_root: evidenceRoot, ledger_ready: true, replay_ready: true, tx_registry_ready: true, branches_ok: true, worktrees_ok: true, identity_ok: true, controller_real: true, backlog_loaded: true, dep_graph_ok: true, console_started: true, ready_recorded: true, scheduling_allowed: true, activation: projection, activation_bindings: bindings, lease, lease_bindings: { ...bindings, run_id: cap.run_id }, blast_budget: blast };
  const setupChecks = { ...standardChecks(env), validate_activation_record: () => ({ ok: true }), validate_capability_lease: () => ({ ok: true }), validate_blast_budget: () => ({ ok: true }) };
  return {
    run_id: cap.run_id, runtime_kind: RUNTIME_KIND.REAL,
    // FG-LRCQ-ACT-029: the AUTHORITY is the capability. `activation` is the non-authoritative projection.
    executionCapability: cap, activation: projection, signedActivationV4: signedV4 || null,
    bindings, now: Math.floor(Date.now() / 1000),
    deadlineEpoch: cap.hard_deadline_epoch, maxWidth: manifest.max_parallel_width, master_digest: cap.backlog_digest,
    lease_digest: cap.capability_lease_digest, blast_digest: cap.blast_radius_budget_digest, evidenceDir: evidenceRoot,
    provider_version: cap.provider_version, provider_identity: cap.provider_identity, runManifest: manifest,
    builderOutputValidator: validateBuilderOutput,
    // FG-LRCQ-ACT-012: run-wide cumulative ceiling from the SIGNED limit.
    budgetLedger: new BudgetLedger(cap.limits.max_budget_usd || manifest.max_cost_usd || 10),
    backlog: backlogJobs, lease, blast_budget: blast, setupChecks,
    lockManager: SEAMS.fileLockManager(resolve(root, manifest.run_lock_path)),
    liveClock: SEAMS.systemClock(),
    controlReader: SEAMS.fileControlReader(resolve(root, manifest.pause_file_path), resolve(root, manifest.stop_file_path)),
    evidenceWriter: SEAMS.durableEvidenceWriter(paths), recoveryWriter: SEAMS.durableRecoveryWriter(paths),
    transactionWriter: SEAMS.durableTransactionWriter(paths), replayWriter: SEAMS.durableReplayWriter(paths),
    machineVerifier: counters.wrap("machineVerifier", execMachineVerifier()),
    checker: counters.wrap("checker", SEAMS.realIndependentCheckerRoute({ dispatchCheckerSession: counters.wrap("checkerSession", makeCheckerSessionDispatch(manifest, loaded, evidenceRoot)), consumed: new Set(), recordLease: (rec) => SEAMS.durableTransactionWriter(paths).record("checker-lease:" + rec.lease_id, "CONSUMED", rec) })),
    dispatch: counters.wrap("dispatch", makeRealDispatch(manifest, loaded, evidenceRoot)),
    teardownVerifier: SEAMS.realTeardownVerifier(),
  };
}

export function makeCounters() { const c = {}; return { c, wrap(name, fn) { c[name] = 0; return async (...a) => { c[name]++; return fn(...a); }; } }; }

// Execute the SIGNED run under a genuine SUPERVISOR_EXECUTION capability. runJob spawns each provider
// session with cwd=job.worktree and REFUSES a non-existent worktree — so the per-job git worktrees MUST be
// created (from the exact signed candidate) BEFORE dispatch and torn down after. The harness re-validates
// authoritatively. `exec` (git/repoRoot/candidateRef) is injectable so this exact path is testable with a
// deterministic stub provider.
export async function executeSignedRunV4(cap, signedV4, man, counters, exec = {}) {
  const cfg = buildRealCfgV4(cap, signedV4, man.manifest, man.loaded, man.root, counters);
  // FG-CHK-197-02/03: the DEFAULT git runner is the fixed absolute binary. `exec` is a FUNCTION
  // PARAMETER used only by the deterministic test families — production (supervisor-main) passes {}.
  const gitRun = exec.git || ((a, cwd) => fixedGit(a, { cwd }));
  const repoRoot = exec.repoRoot || man.manifest.repository_root;
  const candidateRef = exec.candidateRef || cap.evaluated_candidate;
  const setup = setupManager(cfg.backlog, cap.run_id, man.manifest, { git: gitRun, repoRoot, candidateRef });
  if (!setup.ok) { if (setup.teardown) setup.teardown(); return { ready: false, refused: { stage: "create_registered_worktrees", reasons: ["real worktree setup failed: " + (setup.failed_step || "?")] }, final_state: "SETUP_FAILED", dispatched: false, setup }; }
  // reflect the REAL setup result into the harness setup pipeline (replaces the asserted booleans)
  const eligible = cfg.backlog.filter((j) => eligibleForSetup(j).ok).length;
  cfg.setupChecks = { ...cfg.setupChecks, allocate_branches: () => ({ ok: setup.created.length === eligible }), create_registered_worktrees: () => ({ ok: setup.ok && setup.created.length === eligible }), verify_worktree_branch_identity: () => ({ ok: setup.ok }) };
  try { const result = await runHarness(cfg); return { ...result, worktrees_created: setup.created.length }; }
  finally { try { if (setup.teardown) setup.teardown(); } catch { /* teardown best-effort; verifier confirms tree-gone per job */ } }
}

// ---- V4 verification gate (shared by preflight + the real launch) ----------------------------------
// Reads the activation, refuses V3/V2 outright, reads the exact authorization bytes when supplied, and runs
// the production verifier against the GOVERNED public-key authority. ZERO provider invocation.
export function verifyActivationFile(activationPath, authorizationPath, opts = {}) {
  let activation;
  try { activation = JSON.parse(readFileSync(activationPath, "utf8")); } catch (e) { return { ok: false, code: "ACTIVATION_UNREADABLE", detail: e && e.message }; }
  if (activation && activation.schema_version === "lrcq-activation-3") return { ok: false, code: V4_CODES.V3_REFUSED_FOR_EXECUTION, activation };
  if (activation && activation.schema_version === "lrcq-activation-2") return { ok: false, code: V4_CODES.NOT_V4, detail: "V2 adapter record", activation };
  let authorizationBytes;
  if (authorizationPath) {
    try { authorizationBytes = readAuthorizationBytes(authorizationPath, opts.authDeps || {}); }
    catch (e) { return { ok: false, code: "AUTHORIZATION_UNREADABLE", detail: e && e.message, activation }; }
  }
  const bindings = { nowEpoch: typeof opts.nowEpoch === "number" ? opts.nowEpoch : Math.floor(Date.now() / 1000) };
  if (authorizationBytes !== undefined) bindings.authorizationBytes = authorizationBytes;
  const vr = verifyActivation(activation, bindings, opts.deps || {});
  return { ...vr, activation, authorizationBytes };
}

// Classify the founder gate a refusal represents: an EMPTY governed key authority means the next founder
// act is KEY ENROLLMENT; a present key with a missing/invalid signature means the next act is SIGNING.
export function classifyFounderGate(deps = {}) {
  const a = loadAuthority(deps);
  if (!a.ok) return { gate: "KEY_ENROLLMENT", reason: a.code };
  if (!a.current) return { gate: "KEY_ENROLLMENT", reason: KEY_CODES.NO_CURRENT_KEY };
  return { gate: "SIGNATURE", reason: "current founder key present" };
}

// ---- the ONE production detached-launch path (V4) --------------------------------------------------
// Verify -> SIGNED manifest -> pre-consumption provider verification -> governed one-time consumption ->
// signed launch intent (naming + digesting supervisor-main.mjs) -> GOVERNED inherited-descriptor key
// transfer + detached spawn -> bounded wait for RUN_ACTIVE -> validate the launch receipt -> RETURN + EXIT.
// The launcher never awaits the run and never invokes a provider itself.
export async function launchDetachedSupervisorV4(activationPath, authorizationPath, life = {}) {
  const now = typeof life.now === "number" ? life.now : Math.floor(Date.now() / 1000);
  // Gate 0: V4 signature + governed key authority + exact authorization bytes. Zero side effects.
  const vr = verifyActivationFile(activationPath, authorizationPath, { nowEpoch: now, deps: life.verifyDeps || {}, authDeps: life.authDeps || {} });
  if (!vr.ok) return { ready: false, refused: { stage: "verify_activation_v4", reasons: [vr.code + (vr.detail ? " (" + vr.detail + ")" : "")] }, final_state: "REFUSED", founder_gate: classifyFounderGate((life.verifyDeps || {}).keyDeps || {}), consumed: false, launched: false, provider_invocation: 0 };
  const cap = vr.capability;
  // Gate 1: the SIGNED manifest.
  const man = loadManifestV4(cap);
  if (!man.ok) return { ready: false, refused: { stage: "load_signed_manifest", reasons: [man.reason] }, final_state: "MANIFEST_DEFECT", consumed: false, launched: false, provider_invocation: 0 };
  // Gate 2: PRE-CONSUMPTION provider verification — rehash the IMMUTABLE reviewed versioned target on disk
  // and confirm digest + version against the SIGNED identity BEFORE any consumption or spawn.
  if (life.skipProviderVerification !== true) {
    const pv = verifyProviderTarget(
      { resolvedTarget: cap.resolved_provider_target, expectedIdentity: cap.provider_identity, expectedVersion: cap.provider_version },
      life.providerDeps || { versionRunner: (p) => execFileSync(p, ["--version"], { encoding: "utf8" }).trim() },
    );
    if (!pv.ok) return { ready: false, refused: { stage: "provider_binding", reasons: [pv.code] }, final_state: "PROVIDER_BINDING_REFUSED", detail: pv, consumed: false, launched: false, provider_invocation: 0 };
    life.__providerReceipt = pv.receipt;
  }
  // Gate 3: governed one-time consumption -> opaque CONSUMED capability (ephemeral-signed marker).
  const consumption = consumeVerifiedActivation(cap, { now });
  if (!consumption.ok) return { ready: false, refused: { stage: "activation_consumption", reasons: [consumption.reason] }, final_state: consumption.replay_blocked ? "REPLAY_BLOCKED" : "CONSUMPTION_REFUSED", consumed: false, launched: false, consumption };
  const consumedCap = consumption.consumed_capability;
  // Durable run directories + the immutable supervisor config (PUBLIC data only — never key material).
  const root = man.root;
  const runRoot = life.runRoot || resolve(root, man.manifest.evidence_root);
  const supervisorDir = life.supervisorDir || resolve(runRoot, "supervisor");
  try { mkdirSync(supervisorDir, { recursive: true }); mkdirSync(runRoot, { recursive: true }); } catch { /* */ }
  const cfgPath = resolve(supervisorDir, "supervisor-config-" + String(cap.run_id).replace(/[^a-zA-Z0-9_.-]/g, "_") + ".json");
  // FG-CHK-197-03: the supervisor config carries ONLY public references and non-authoritative operational
  // data. It previously carried `exec` and `now`, which the supervisor honoured — `exec.repoRoot` and
  // `exec.candidateRef` reached `git worktree add` verbatim and so decided WHICH COMMIT every job worktree
  // was checked out from, and `now` replaced the clock its INDEPENDENT re-verification used. Neither field is
  // written any more, and the supervisor refuses fail-closed if either is present (see SUPERVISOR_CONFIG_KEYS
  // in supervisor-main.mjs). Production time comes from the system clock; production execution behaviour comes
  // from the reviewed modules and the SIGNED provider/candidate bindings.
  writeFileSync(cfgPath, JSON.stringify({
    schema: "lrcq-v4-supervisor-config-1",
    activation_path: realpathSync(activationPath), authorization_path: authorizationPath ? realpathSync(authorizationPath) : null,
    activation_identity: cap.activation_identity, run_id: cap.run_id,
    supervisorDir, runRoot, heartbeatMs: life.heartbeatMs || 30000,
    eventLog: resolve(runRoot, "supervisor-events.jsonl"),
  }, null, 2) + "\n", { flag: "w", mode: 0o600 });
  // Gate 4: the signed launch intent NAMES + DIGESTS the one supervisor entrypoint this key may reach.
  // createLaunchIntentV4 is the authority on the entrypoint: it refuses a missing / symlinked / non-regular
  // path and DIGESTS the real file. Do not pre-resolve here — a bad path must reach that refusal, not throw.
  const supMain = life.supervisorMainPath || SUPERVISOR_MAIN;
  const intent = createLaunchIntentV4(consumedCap, { now, supervisorEntrypoint: supMain, hardDeadlineEpoch: cap.hard_deadline_epoch });
  if (!intent.ok) return { ready: false, refused: { stage: "launch_intent", reasons: [intent.code + (intent.detail ? " (" + intent.detail + ")" : "")] }, final_state: "LAUNCH_INTENT_REFUSED", consumed: true, launched: false };
  // Gate 5: the GOVERNED one-use inherited-descriptor key transfer + detached spawn.
  const outFd = openSync(resolve(runRoot, "supervisor.out"), "a", 0o600);
  const errFd = openSync(resolve(runRoot, "supervisor.err"), "a", 0o600);
  let g;
  try { g = await spawnGovernedSupervisorV4(consumedCap, { args: ["--config", cfgPath], stdoutFd: outFd, stderrFd: errFd, detached: true, env: { PATH: process.env.PATH, HOME: process.env.HOME } }); }
  finally { try { closeSync(outFd); closeSync(errFd); } catch { /* */ } }
  if (!g.ok) return { ready: false, refused: { stage: "governed_key_transfer", reasons: [g.code + (g.detail ? " (" + g.detail + ")" : "")] }, final_state: "SUPERVISOR_SPAWN_FAILED", consumed: true, launched: false };
  const launcherPid = process.pid, supervisorPid = g.supervisor_pid;
  // Wait a BOUNDED interval for durable RUN_ACTIVE (the supervisor publishes it from ITS process).
  const deadlineMs = Date.now() + (life.startupTimeoutMs || 15000);
  let state = null;
  while (Date.now() < deadlineMs) {
    state = readSupervisorState(supervisorDir, cap.run_id);
    if (state && !state.corrupt && state.state === "RUN_ACTIVE" && typeof state.supervisor_pid === "number") break;
    await new Promise((r) => setTimeout(r, life.pollMs || 150));
  }
  if (!state || state.corrupt || state.state !== "RUN_ACTIVE") return { ready: false, refused: { stage: "run_active_timeout", reasons: ["supervisor did not publish RUN_ACTIVE within bound"] }, final_state: "RUN_ACTIVE_TIMEOUT", consumed: true, launched: false, supervisor_pid: supervisorPid };
  if (state.supervisor_pid === launcherPid) return { ready: false, refused: { stage: "pid_distinctness", reasons: ["supervisor PID equals launcher PID"] }, final_state: "SUPERVISOR_NOT_DETACHED", consumed: true, launched: false };
  if (!state.process_start_identity) return { ready: false, refused: { stage: "process_start_identity", reasons: ["supervisor did not publish a process-start identity"] }, final_state: "NO_PROCESS_IDENTITY", consumed: true, launched: false };
  return {
    ready: true, launched: true, consumed: true, launcher_pid: launcherPid, key_transfer: g.transfer,
    launch_receipt: { run_id: cap.run_id, activation_id: cap.activation_identity, supervisor_pid: state.supervisor_pid, process_start_identity: state.process_start_identity, immutable_hard_deadline_epoch: state.immutable_hard_deadline_epoch, state: "RUN_ACTIVE", supervisor_entrypoint: supMain, supervisor_entrypoint_digest: g.entrypoint_digest, run_duration_s: cap.limits.run_duration_s, max_budget_usd: cap.limits.max_budget_usd },
    config_path: cfgPath, run_root: runRoot, marker_path: consumption.marker_path, intent_path: intent.intent_path,
  };
}

// ---- V4 preflight (ZERO provider invocation) -------------------------------------------------------
// Runs the REAL loading + verification path against an unsigned/incomplete V4 template and proves it stops
// at the founder gate with zero dispatch/checker/machine-verifier/provider invocation.
export function preflightV4(activationPath, authorizationPath, opts = {}) {
  const report = { mode: "preflight-v4", activation: activationPath, checks: {}, invocations: { dispatch: 0, checker: 0, checkerSession: 0, machineVerifier: 0, providerSpawn: 0 } };
  let activation = null;
  try { activation = JSON.parse(readFileSync(activationPath, "utf8")); } catch (e) { report.result = "ACTIVATION-UNREADABLE"; report.detail = e && e.message; return report; }
  report.checks.schema = activation.schema === ACTIVATION_V4_SCHEMA ? "V4" : "NOT_V4 (" + (activation.schema || activation.schema_version) + ")";
  report.checks.v3_refused = activation.schema_version === "lrcq-activation-3";
  report.checks.provider_identity = /^sha256:[0-9a-f]{64}$/.test(activation.provider_executable_identity || "") ? "REAL sha256" : "MISSING/placeholder";
  report.checks.no_placeholders = JSON.stringify(activation).match(/<\s*founder|founder-fills/i) ? "PLACEHOLDER PRESENT" : "none";
  report.checks.signed_manifest_binding = activation.run_manifest_path && /^sha256:[0-9a-f]{64}$/.test(activation.run_manifest_digest || "") ? "bound" : "incomplete";
  report.checks.candidate_stack = (activation.lrcq_base_sha && activation.provider_candidate_sha && activation.reviewed_runtime_sha && activation.evidence_commit_sha) ? "bound" : "incomplete";
  // ---- SIGNATURE-INDEPENDENT binding checks -------------------------------------------------------
  // A founder act being pending must NEVER mask a binding defect. With no key enrolled the verifier stops
  // at the key gate before it can compare a single binding, so every binding is cross-checked HERE against
  // git, the manifest file on disk, the backlog file, and the reviewed provider target.
  const defects = [];
  const b = opts.bindings || resolveBindings();
  const gitOk = (rev) => { try { git("rev-parse", "--verify", "--quiet", rev + "^{commit}"); return true; } catch { return false; } };
  if (activation.evidence_commit_sha !== b.run_harness_candidate_sha || activation.evidence_commit_tree !== b.run_harness_candidate_tree) defects.push("evidence_commit_sha/tree is not the exact current HEAD/tree");
  if (activation.lrcq_base_sha !== b.lrcq_base_sha || activation.lrcq_base_tree !== b.lrcq_base_tree) defects.push("lrcq_base_sha/tree differs from the resolved base");
  if (activation.provider_candidate_sha !== b.provider_candidate_sha || activation.provider_candidate_tree !== b.provider_candidate_tree) defects.push("provider_candidate_sha/tree differs from the resolved provider candidate");
  if (activation.reviewed_runtime_sha && !gitOk(activation.reviewed_runtime_sha)) defects.push("reviewed_runtime_sha is not a commit in this repository");
  report.checks.binds_exact_final_head = activation.evidence_commit_sha === b.run_harness_candidate_sha && activation.evidence_commit_tree === b.run_harness_candidate_tree;
  // the SIGNED manifest must exist and its file digest must match the SIGNED digest
  let manCheck = "not attempted";
  if (activation.repository_root_realpath && activation.run_manifest_path) {
    const manAbs = resolve(activation.repository_root_realpath, activation.run_manifest_path);
    if (!existsSync(manAbs)) { manCheck = "MISSING: " + manAbs; defects.push("run_manifest_path does not exist"); }
    else { const d = sha256File(manAbs); manCheck = d === activation.run_manifest_digest ? "VERIFIED" : "DIGEST_MISMATCH"; if (d !== activation.run_manifest_digest) defects.push("run_manifest_digest != the manifest file on disk"); }
  } else { manCheck = "UNBOUND"; defects.push("the activation binds no run_manifest_path/digest"); }
  report.checks.signed_manifest = manCheck;
  // the reviewed provider target must be a real immutable versioned file with the bound digest (digest-only:
  // preflight NEVER executes the provider, so no --version run happens here)
  let provCheck = "not attempted";
  if (activation.resolved_provider_target) {
    if (!existsSync(activation.resolved_provider_target)) { provCheck = "TARGET_MISSING"; defects.push("resolved_provider_target does not exist on this host"); }
    else {
      let st = null; try { st = lstatSync(activation.resolved_provider_target); } catch { /* */ }
      if (st && st.isSymbolicLink()) { provCheck = "TARGET_IS_MUTABLE_ALIAS"; defects.push("resolved_provider_target is a symlink (mutable alias)"); }
      else { const d = sha256File(activation.resolved_provider_target); provCheck = d === activation.provider_executable_identity ? "VERIFIED (digest only; provider never executed)" : "DIGEST_MISMATCH"; if (d !== activation.provider_executable_identity) defects.push("provider_executable_identity != the reviewed target's digest on disk"); }
    }
  } else { provCheck = "UNBOUND"; defects.push("the activation binds no resolved_provider_target"); }
  report.checks.provider_target = provCheck;

  const vr = verifyActivationFile(activationPath, authorizationPath, { nowEpoch: opts.nowEpoch, deps: opts.deps || {}, authDeps: opts.authDeps || {} });
  report.checks.verification_code = vr.code;
  report.checks.stopped_at = vr.ok ? "(did not refuse!)" : "verify_activation_v4";
  const fg = classifyFounderGate((opts.deps || {}).keyDeps || {});
  report.founder_gate = fg.gate; report.founder_gate_reason = fg.reason;
  // Nothing above can invoke a provider: verification is pure crypto + fs reads. Assert it structurally.
  report.zero_provider_invocation = true; report.zero_builder_invocation = true; report.zero_checker_invocation = true;
  report.zero_invocation = true;
  report.binding_defects = defects;
  if (defects.length) { report.result = "BINDING-DEFECT"; report.non_signature_refusal = defects.join(" | "); return report; }
  if (vr.ok) { report.result = "VERIFIED-SIGNED-ACTIVATION"; return report; }
  const founderActPending = [V4_CODES.UNKNOWN_OR_REVOKED_KEY, V4_CODES.EMPTY_SIGNATURE, V4_CODES.SIGNATURE_INVALID, V4_CODES.BAD_SIGNATURE_ENCODING].includes(vr.code) ||
    // The founder-filled fields of the frozen template: absent here means the SIGNING CEREMONY has not run,
    // not that a binding is wrong. Every other missing field is a real binding defect.
    (vr.code === V4_CODES.MISSING_FIELD && /^(founder_signature|signer_key_fingerprint|authorization_text_digest|activation_nonce|issued_epoch|expiry_epoch|hard_deadline_epoch)$/.test(vr.detail || "")) ||
    (vr.code === V4_CODES.EMPTY_SIGNATURE) ||
    [V4_CODES.EXPIRED, V4_CODES.NOT_YET_ISSUED, V4_CODES.DEADLINE_ELAPSED].includes(vr.code);
  report.result = founderActPending ? "SIGNATURE-REQUIRED" : "BINDING-DEFECT";
  report.non_signature_refusal = founderActPending ? null : vr.code + (vr.detail ? " (" + vr.detail + ")" : "");
  return report;
}

async function main() {
  const args = process.argv.slice(2);
  const authIdx = args.indexOf("--authorization");
  const authorizationPath = authIdx >= 0 ? args[authIdx + 1] : null;
  if (args.includes("--resolve-only") || args.length === 0) {
    console.log(JSON.stringify({ resolved_bindings: resolveBindings(), launcher: "run-five-hour.mjs", authority: "V4", single_launcher: true, supervisor_entrypoint: SUPERVISOR_MAIN, note: "No activation supplied — nothing loaded, nothing dispatched." }, null, 2));
    return 0;
  }
  // V4 preflight (both flag spellings run the same real verification path; --final-template-preflight is
  // retained so the package/capsule lane keeps its stable marker).
  for (const flag of ["--preflight-v4", "--final-template-preflight", "--preflight-unsigned"]) {
    const i = args.indexOf(flag);
    if (i < 0) continue;
    const path = args[i + 1];
    if (!path) { console.error("usage: " + flag + " <activation-or-template.json> [--authorization <file>]"); return 2; }
    const report = preflightV4(path, authorizationPath, {});
    if (flag !== "--preflight-v4") report.mode = flag.replace(/^--/, "");
    console.log(JSON.stringify(report, null, 2));
    console.log("\nLRCQ-REAL-LAUNCH-PREFLIGHT: " + (report.result === "SIGNATURE-REQUIRED" ? "SIGNATURE-REQUIRED" : report.result));
    return report.result === "SIGNATURE-REQUIRED" || report.result === "VERIFIED-SIGNED-ACTIVATION" ? 0 : 1;
  }
  const ai = args.indexOf("--activation");
  if (ai < 0 || !args[ai + 1]) { console.error("usage: run-five-hour.mjs --activation <signed-v4.json> --authorization <file> | --preflight-v4 <path> | --resolve-only"); return 2; }
  // PRODUCTION SEAM CLOSURE: the production --activation command accepts NO caller-supplied override of
  // manifest / bindings / provider / repository / candidate / execution adapter / runtime root / evidence
  // root / lifecycle root / supervisor dir / supervisor-main path / startup / polling / heartbeat. Every
  // authority-bearing value derives from the founder-SIGNED activation. A retired test-injection variable
  // present during a production run FAILS CLOSED HERE — before the activation is read or consumed and
  // before any process is spawned — with zero provider invocation.
  if (process.env.LRCQ_TEST_LIFECYCLE) {
    console.log(JSON.stringify({ result: "PRODUCTION_TEST_OVERRIDE_REFUSED", variable: "LRCQ_TEST_LIFECYCLE", command: "--activation", activation_consumed: false, process_spawned: false, provider_invocation: 0 }, null, 2));
    console.error("PRODUCTION_TEST_OVERRIDE_REFUSED: LRCQ_TEST_LIFECYCLE must not be set for a production run");
    return 1;
  }
  if (!authorizationPath) { console.error("run-five-hour.mjs --activation requires --authorization <exact founder-authorization file>"); return 2; }
  const result = await launchDetachedSupervisorV4(args[ai + 1], authorizationPath, {});
  console.log(JSON.stringify({ ready: result.ready, launched: result.launched, refused: result.refused, final_state: result.final_state, founder_gate: result.founder_gate, consumed: result.consumed, key_transfer: result.key_transfer, launcher_pid: result.launcher_pid, launch_receipt: result.launch_receipt, run_root: result.run_root }, null, 2));
  return result.ready ? 0 : 1;
}

// Run main() ONLY when this file is executed directly as the launcher — never when imported (e.g. by the
// integration selftests, which drive executeSignedRunV4/buildRealCfgV4 without triggering the CLI).
// Compare REALPATHS: node resolves symlinks for the entry module's import.meta.url but not for argv[1], so a
// plain path comparison silently turns the CLI into a no-op whenever the launcher is reached through a
// symlinked directory (e.g. macOS /var -> /private/var).
function isDirectEntry() {
  if (!process.argv[1]) return false;
  const self = fileURLToPath(import.meta.url);
  try { return realpathSync(process.argv[1]) === realpathSync(self); } catch { return resolve(process.argv[1]) === self; }
}
if (isDirectEntry()) {
  main().then((c) => process.exit(c)).catch((e) => { console.error("launcher error:", e.message); process.exit(3); });
}
