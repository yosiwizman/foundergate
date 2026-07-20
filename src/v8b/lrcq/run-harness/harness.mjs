// FounderGate LRCQ — SINGLE run orchestrator (first internal 5h WIDE-SAFE run).
// This is the ONE place that wires the governed lifecycle end to end:
//   activation -> exact candidate/backlog/provider binding -> run lock -> setup pipeline
//   -> capability lease -> blast-radius -> controller REAL -> eligible WIDE_SAFE selection
//   -> branch/worktree verify -> sealed intent -> single-route dispatch -> SEPARATE machine
//   verification -> independent read-only checker -> correction/completion -> replay ->
//   reconciliation -> durable evidence seal -> lock release + teardown -> pause/stop/deadline.
//
// It NEVER: invokes an alternate provider route; launches without a valid activation record;
// dispatches without a valid single-use lease; dispatches without a sealed AUTHORIZED intent;
// retries an uncertain dispatch; treats builder success as completion OR as machine verification;
// treats an undefined checker result as CLEAN; treats checker CLEAN as accept/merge; pushes;
// merges; writes protected main; contacts M1/AKIOR; touches customer data.
//
// TWO runtime kinds. REAL requires EVERY production seam to be an explicit non-null
// implementation (fail-closed: a missing seam is ACTIVATION_REFUSED, never a default).
// DETERMINISTIC_TEST permits injected/synthetic seams. REAL mode NEVER infers test behavior.

import { Controller, MODE, isEligible, jobsCollide } from "../controller.mjs";
import { validateActivationV3, validateLease, validateBlastBudget, blastExceeded, authorityViolations } from "../assurance/assurance-core.mjs";
import { runSetup } from "./setup-pipeline.mjs";
import { SeparationJob } from "./separation.mjs";
import { ReplayStream } from "./replay.mjs";
import { validateIntent, canDispatch, reconcile, mayResume } from "../reconciliation/transaction.mjs";
import { createHash } from "node:crypto";

// Deterministic digest of a lease (stable key order).
export function leaseDigest(lease) { return "sha256:" + createHash("sha256").update(JSON.stringify(Object.keys(lease).sort().map((k) => [k, lease[k]]))).digest("hex"); }

// Mint a fresh, per-job, per-ATTEMPT, SINGLE-USE builder lease (FG-LRCQ-ACT-001). The harness
// ALWAYS mints single_use:true / uses_remaining:1 with a unique lease_id, regardless of any
// permissive template — a run-level reusable lease can never grant authority to a dispatch.
export function mintBuilderLease(cfg, job, attempt) {
  const t = cfg.lease || {};
  return {
    lease_id: "lease:builder:" + cfg.run_id + ":" + job.job_id + ":" + attempt,
    run_id: cfg.run_id, job_id: job.job_id, attempt, role: "builder",
    candidate_stack: (cfg.bindings && cfg.bindings.candidate_stack) || t.candidate_stack || "stack",
    branch: job.branch, worktree: job.worktree,
    allowed_files: job.allowed_files || t.allowed_files || ["src/"], allowed_tools: t.allowed_tools || ["Read"], denied_tools: t.denied_tools || ["Bash"],
    effect_class: t.effect_class || job.effect_class || "LOCAL_FS", deadline_epoch: cfg.deadlineEpoch || 9e12, max_cost_usd: t.max_cost_usd ?? 5,
    max_files: t.max_files ?? 10, max_changed_lines: t.max_changed_lines ?? 500, max_external_calls: t.max_external_calls ?? 0, max_delegation_depth: t.max_delegation_depth ?? 1,
    evidence_dir: cfg.evidenceDir || t.evidence_dir || "/ev", single_use: true, uses_remaining: 1, expiry_epoch: t.expiry_epoch ?? 9e12, revoked: false,
  };
}

export const RUNTIME_KIND = { REAL: "REAL", DETERMINISTIC_TEST: "DETERMINISTIC_TEST" };

// Seams that MUST be explicit non-null implementations in REAL mode. Missing any -> refuse.
export const REQUIRED_REAL_SEAMS = [
  "setupChecks", "lockManager", "liveClock", "controlReader", "evidenceWriter", "recoveryWriter",
  "transactionWriter", "replayWriter", "machineVerifier", "checker", "dispatch", "teardownVerifier",
];
export const CHECKER_RESULTS = { CLEAN: "CLEAN", FINDINGS: "FINDINGS", INSUFFICIENT_EVIDENCE: "INSUFFICIENT_EVIDENCE" };

export const HARNESS_STAGES = [
  "runtime_kind", "real_seam_check", "load_activation", "validate_activation", "validate_candidate_stack",
  "validate_backlog_digests", "validate_provider_identity", "acquire_run_lock", "setup_pipeline",
  "validate_capability_lease", "validate_blast_budget", "controller_real_init", "select_wide_safe",
  "verify_branch_worktree", "seal_intent", "dispatch_single_route", "machine_verification",
  "independent_checker", "transition", "replay_event", "reconciliation", "seal_evidence", "teardown",
];

function refuse(stage, reasons, extra = {}) {
  return { ready: false, refused: { stage, reasons: [].concat(reasons) }, dispatched: false, ...extra };
}

// Durable-writer facade. In REAL mode every writer is a required non-null seam; in
// DETERMINISTIC_TEST an absent writer is a silent no-op so pure unit tests stay light.
function makeWriters(cfg) {
  const call = (obj, method, ...a) => { try { if (obj && typeof obj[method] === "function") return obj[method](...a); } catch (e) { /* durable-writer errors are surfaced via ledger, never swallow correctness */ throw e; } };
  return {
    evidence: (rec) => call(cfg.evidenceWriter, "append", rec),
    evidenceIndex: (entry) => call(cfg.evidenceWriter, "index", entry),
    recovery: (state) => call(cfg.recoveryWriter, "write", state),
    nextSafeAction: (text) => call(cfg.recoveryWriter, "nextSafeAction", text),
    tx: (key, state, extra) => call(cfg.transactionWriter, "record", key, state, extra),
    replayW: (ev) => call(cfg.replayWriter, "append", ev),
  };
}

// Live clock: REAL reads the injected system clock; DETERMINISTIC_TEST may advance via cfg.clock.
function refreshClock(cfg, controller) {
  if (typeof cfg.liveClock === "function") controller.now = cfg.liveClock();
  else if (typeof cfg.clock === "function") cfg.clock(controller);
}
// Live control: REAL reads durable pause/stop files each loop; test may pass cfg.control.
function readControl(cfg) {
  if (typeof cfg.controlReader === "function") { const c = cfg.controlReader() || {}; return { pause: !!c.pause, stop: !!c.stop }; }
  return { pause: !!(cfg.control && cfg.control.pause), stop: !!(cfg.control && cfg.control.stop) };
}

// Separate machine-verification stage. Provider SUCCESS is NEVER machine verification.
async function machineVerify(cfg, job, prov, ctx) {
  if (cfg.runtime_kind === RUNTIME_KIND.REAL) {
    const r = await cfg.machineVerifier(job, prov, ctx); // mandatory seam (checked at entry)
    return { pass: r && r.pass === true, report: r };
  }
  if (typeof cfg.machineVerifier === "function") { const r = await cfg.machineVerifier(job, prov, ctx); return { pass: r && r.pass === true, report: r }; }
  return { pass: prov.ok === true && prov.machine_verified !== false, report: { synthetic: true } }; // DETERMINISTIC_TEST fallback only
}

// Independent checker stage. Undefined output -> INSUFFICIENT_EVIDENCE, NEVER CLEAN. In REAL
// there is no provider-derived fallback; the checker seam is mandatory.
async function runChecker(cfg, job, builderSession, attempt, governedContext) {
  let raw, defaultSession = { session_id: "checker:" + cfg.run_id + ":" + job.job_id + ":" + attempt, prompt_digest: "cpd:" + job.job_id + ":" + attempt, read_only: true };
  // REAL mode: the signed activation MUST be present in the governed context before any checker
  // spawn — an absent/incomplete activation is INSUFFICIENT_EVIDENCE, never CLEAN (FG-LRCQ-ACT-002).
  if (cfg.runtime_kind === RUNTIME_KIND.REAL && (!governedContext || !governedContext.signed_activation || typeof governedContext.signed_activation !== "object" || Object.keys(governedContext.signed_activation).length === 0)) {
    return { result: CHECKER_RESULTS.INSUFFICIENT_EVIDENCE, clean: false, session: defaultSession };
  }
  if (cfg.runtime_kind === RUNTIME_KIND.REAL) raw = await cfg.checker(job, builderSession, attempt, governedContext);
  else if (typeof cfg.checker === "function") raw = await cfg.checker(job, builderSession, attempt, governedContext);
  else raw = { result: cfg.__syntheticCheckerClean === false ? "FINDINGS" : "CLEAN", session: defaultSession };
  // normalize: accept {result} (real) or {clean} (legacy test). Undefined -> INSUFFICIENT_EVIDENCE.
  let result;
  if (raw && typeof raw.result === "string") result = raw.result;
  else if (raw && typeof raw.clean === "boolean") result = raw.clean ? CHECKER_RESULTS.CLEAN : CHECKER_RESULTS.FINDINGS;
  else result = CHECKER_RESULTS.INSUFFICIENT_EVIDENCE;
  return { result, clean: result === CHECKER_RESULTS.CLEAN, session: (raw && raw.session) || defaultSession };
}

async function governedDispatch(cfg, job, intent, lease, budget, usage, txByKey, bindings, w, consumed) {
  const cd = canDispatch(intent, txByKey);
  if (!cd.ok) return { dispatched: false, refused: cd.reason, duplicate: !!cd.duplicate };
  // the exact per-attempt single-use lease is revalidated at the dispatch boundary against THIS job
  const lv = validateLease(lease, { ...bindings, run_id: cfg.run_id, job_id: job.job_id, role: "builder", branch: job.branch, worktree: job.worktree });
  if (!lv.valid) return { dispatched: false, refused: "lease invalid at dispatch: " + lv.refusals.join(";") };
  // a consumed lease can NEVER be re-used for a dispatch (FG-LRCQ-ACT-001)
  if (consumed && consumed.has(lease.lease_id)) return { dispatched: false, refused: "lease already consumed: " + lease.lease_id };
  const projected = { ...usage, max_records: (usage.max_records || 0) + 1 };
  const ex = blastExceeded(budget, projected);
  if (ex.length) return { dispatched: false, refused: "blast budget exceeded: " + ex.join(";") };
  // ATOMICALLY + DURABLY consume the single-use lease BEFORE the provider call, recording the
  // full consumption record; then mark DISPATCHED. A crash after this is an uncertain dispatch
  // that reconciliation must NOT re-fire, and the lease is already spent (cannot re-mint/retry).
  const preUses = lease.uses_remaining;
  lease.uses_remaining = 0; if (consumed) consumed.add(lease.lease_id);
  w.tx("lease:" + lease.lease_id, "CONSUMED", { lease_id: lease.lease_id, lease_digest: leaseDigest(lease), job_id: job.job_id, attempt: job.__attempt || intent.attempt, consumed_epoch: cfg.now || 0, pre_uses_remaining: preUses, post_uses_remaining: 0, dispatch_transaction_id: intent.transaction_id });
  txByKey[intent.idempotency_key] = { state: "DISPATCHED", job_id: job.job_id, lease_id: lease.lease_id };
  w.tx(intent.idempotency_key, "DISPATCHED", { job_id: job.job_id, transaction_id: intent.transaction_id, lease_id: lease.lease_id });
  const out = await cfg.dispatch(job, { activation: cfg.activation, bindings });
  return { dispatched: true, provider: out, lease_id: lease.lease_id };
}

async function runJobLifecycle(cfg, job, lease, budget, usage, txByKey, replay, bindings, ledger, controller, w) {
  const sep = new SeparationJob(job.job_id, job.max_attempts || 3);
  const builderSession = { session_id: "builder:" + cfg.run_id + ":" + job.job_id, prompt_digest: "bpd:" + job.job_id, read_only: false };
  while (true) {
    refreshClock(cfg, controller);
    if (controller.deadlineEpoch && controller.now >= controller.deadlineEpoch) { w.evidence({ job: job.job_id, stage: "deadline_before_intent" }); return { job_id: job.job_id, state: "PARKED", reason: "deadline reached before intent seal" }; }
    const attempt = sep.attempts + 1;
    const intent = {
      transaction_id: "tx:" + cfg.run_id + ":" + job.job_id + ":" + attempt,
      idempotency_key: "k:" + cfg.run_id + ":" + job.job_id + ":" + attempt,
      run_id: cfg.run_id, job_id: job.job_id, attempt, role: "builder",
      candidate_stack: bindings.candidate_stack || "stack", backlog_digest: cfg.master_digest,
      lease_digest: cfg.lease_digest, blast_budget_digest: cfg.blast_digest,
      prompt_digest: builderSession.prompt_digest, tool_digests: "tools", worktree: job.worktree,
      branch: job.branch, pre_action_fingerprint: "fp:" + job.job_id + ":" + attempt,
      deadline_epoch: cfg.deadlineEpoch || 9e12, budget_usd: 1, evidence_dir: cfg.evidenceDir || "/ev",
      state: "AUTHORIZED",
    };
    const iv = validateIntent(intent);
    if (!iv.valid) { ledger.push({ job: job.job_id, stage: "seal_intent", refused: iv.refusals }); return { job_id: job.job_id, state: "PARKED", reason: "intent invalid" }; }
    // ---- mint + validate the exact per-attempt SINGLE-USE builder lease BEFORE intent authorization ----
    const attemptLease = mintBuilderLease(cfg, job, attempt);
    const preLv = validateLease(attemptLease, { ...bindings, run_id: cfg.run_id, job_id: job.job_id, role: "builder", branch: job.branch, worktree: job.worktree });
    if (!preLv.valid) { ledger.push({ job: job.job_id, stage: "mint_lease", refused: preLv.refusals }); return { job_id: job.job_id, state: "PARKED", reason: "minted lease invalid: " + preLv.refusals.join(";") }; }
    w.tx("lease:" + attemptLease.lease_id, "MINTED", { lease_id: attemptLease.lease_id, lease_digest: leaseDigest(attemptLease), job_id: job.job_id, attempt, single_use: true, uses_remaining: 1 });
    job.__attempt = attempt;
    w.tx(intent.idempotency_key, "AUTHORIZED", { job_id: job.job_id, attempt, lease_id: attemptLease.lease_id });
    sep.startBuilder(builderSession);
    // ---- single governed dispatch route (validates + atomically consumes the single-use lease) ----
    const d = await governedDispatch(cfg, job, intent, attemptLease, budget, usage, txByKey, bindings, w, cfg.__consumedLeases);
    if (!d.dispatched) return { job_id: job.job_id, state: "PARKED", reason: "dispatch refused: " + d.refused, duplicate: d.duplicate };
    const prov = d.provider || {};
    // ---- uncertain-effect: reconcile; NEVER re-fire ----
    if (prov.uncertain) {
      const obs = prov.obs || { dispatch_exists: true, process_alive: false, definitive_result: false };
      const rec = reconcile(obs);
      const resumable = mayResume(rec, true);
      const txState = resumable ? "INTENT_RECORDED" : "EXTERNALLY_OBSERVED";
      txByKey[intent.idempotency_key] = { state: txState, job_id: job.job_id, reconciliation: rec.state };
      w.tx(intent.idempotency_key, txState, { reconciliation: rec.state });
      const ev = replayEvent(cfg, job, attempt, resumable ? "INTENT_RECORDED" : "DISPATCHED", rec.state);
      replay.append(ev); w.replayW(ev);
      w.recovery({ job: job.job_id, reconciliation: rec.state, recommend: rec.recommend });
      w.nextSafeAction("reconcile " + job.job_id + " (" + rec.state + ") — do not re-fire; founder review");
      ledger.push({ job: job.job_id, stage: "reconciliation", reconciliation: rec.state, recommend: rec.recommend, resumable });
      return { job_id: job.job_id, state: resumable ? "SAFE_TO_RESUME_HELD" : "HELD_RECONCILE", reconciliation: rec.state, recommend: rec.recommend, resumed: false, resumable };
    }
    // ---- FG-LRCQ-ACT-009/Phase-4: validate builder output BEFORE machine verification. Invalid or
    // unbound output is HELD_BUILDER_OUTPUT_INVALID and NEVER reaches MV / checker / completion. ----
    if (cfg.builderOutputValidator && prov.ok === true) {
      const bind = { run_id: cfg.run_id, job_id: job.job_id, attempt, session_id: builderSession.session_id, prompt_digest: builderSession.prompt_digest };
      const bv = cfg.builderOutputValidator(prov.parsed_output, bind);
      if (!bv || bv.valid !== true) { w.evidence({ job: job.job_id, stage: "builder_output_invalid", attempt, refusals: bv && bv.refusals }); w.nextSafeAction("HELD_BUILDER_OUTPUT_INVALID " + job.job_id + " — builder output failed validation before machine verification"); return { job_id: job.job_id, state: "HELD_BUILDER_OUTPUT_INVALID", reason: "builder output invalid: " + (bv && bv.refusals ? bv.refusals.join(";") : "absent") }; }
      w.evidence({ job: job.job_id, stage: "builder_output_valid", attempt });
    }
    // ---- FG-LRCQ-ACT-007: provider process tree MUST be confirmed gone. A false/contradictory
    // teardown blocks completion, becomes HELD_TEARDOWN_DEFECT, and stops the whole run. (undefined
    // tree_gone is only permitted in DETERMINISTIC_TEST unit cfgs that don't model teardown.) ----
    if (prov.tree_gone === false || (cfg.runtime_kind === RUNTIME_KIND.REAL && prov.tree_gone == null && prov.provider_outcome)) {
      cfg.__teardownDefect = true;
      w.evidence({ job: job.job_id, stage: "teardown_defect", tree_gone: prov.tree_gone });
      w.nextSafeAction("HELD_TEARDOWN_DEFECT " + job.job_id + " — process tree not confirmed gone; run stopped");
      return { job_id: job.job_id, state: "HELD_TEARDOWN_DEFECT", reason: "provider process tree not confirmed gone (tree_gone=" + prov.tree_gone + ")" };
    }
    // ---- SEPARATE machine verification (provider success is NOT verification) ----
    sep.builderResult(prov.ok === true);
    const mv = await machineVerify(cfg, job, prov, controller.ctx());
    w.evidence({ job: job.job_id, stage: "machine_verification", attempt, pass: mv.pass, report: mv.report });
    sep.machineVerification(mv.pass);
    if (sep.state === "PARKED") { const ev = replayEvent(cfg, job, attempt, "DISPATCHED", "n/a"); replay.append(ev); w.replayW(ev); return { job_id: job.job_id, state: "PARKED", reason: "parked after repeated machine-verification failure" }; }
    if (sep.state === "CORRECTION_PENDING") { ledger.push({ job: job.job_id, stage: "machine_verification", result: "fail->correction", attempt }); continue; }
    // ---- independent read-only checker (mandatory; undefined -> INSUFFICIENT_EVIDENCE) ----
    // Build an IMMUTABLE governed context that explicitly carries the signed activation to the
    // checker (FG-LRCQ-ACT-002) — no hidden mutable job property transports authority.
    const governedContext = Object.freeze({
      signed_activation: cfg.activation, bindings, run_manifest: cfg.runManifest || null,
      builder_transaction_id: intent.transaction_id, builder_session: builderSession, builder_prompt_digest: builderSession.prompt_digest,
      machine_verifier_report_digest: leaseDigest(mv.report || { pass: mv.pass }), job_id: job.job_id, attempt,
      branch: job.branch, worktree: job.worktree, evidence_dir: cfg.evidenceDir || "/ev",
    });
    const chk = await runChecker(cfg, job, builderSession, attempt, governedContext);
    w.evidence({ job: job.job_id, stage: "independent_checker", attempt, result: chk.result });
    sep.startChecker(chk.session); // throws if not independent / not read-only
    sep.checkerResult(chk.clean === true);
    if (sep.state === "PARKED") { const ev = replayEvent(cfg, job, attempt, "SEALED", "n/a"); replay.append(ev); w.replayW(ev); return { job_id: job.job_id, state: "PARKED", reason: "parked after repeated checker non-CLEAN (" + chk.result + ")", checker_result: chk.result }; }
    if (sep.state === "CORRECTION_PENDING") { ledger.push({ job: job.job_id, stage: "independent_checker", result: chk.result + "->correction", attempt }); continue; }
    // ---- checker CLEAN: durably seal evidence THEN complete (never merge/accept) ----
    txByKey[intent.idempotency_key] = { state: "SEALED", job_id: job.job_id };
    w.tx(intent.idempotency_key, "SEALED", { job_id: job.job_id });
    usage.max_records = (usage.max_records || 0) + 1;
    const ev = replayEvent(cfg, job, attempt, "SEALED", "RESULT_COMPLETE"); replay.append(ev); w.replayW(ev);
    w.evidenceIndex({ job: job.job_id, sealed: true, attempt });
    sep.complete();
    return { job_id: job.job_id, state: "COMPLETED", merged: sep.canMerge(), accepted: sep.canAccept(), checker_result: chk.result };
  }
}

function replayEvent(cfg, job, attempt, txState, reconState) {
  return {
    run_id: cfg.run_id, job_id: job.job_id, attempt, role: "builder", provider: "governed", model_id: null,
    cli_version: cfg.provider_version || "stub", executable_identity: cfg.provider_identity || "stub", policy_version: "pv",
    candidate_stack: "stack", prompt_digest: "pd", allowed_tools_digest: "ad", denied_tools_digest: "dd",
    lease_digest: cfg.lease_digest, blast_budget_digest: cfg.blast_digest, stdout_digest: "od", stderr_digest: "ed",
    transcript_digest: "td", branch: job.branch, worktree: job.worktree, pre_fingerprint: "pf", post_fingerprint: "pf2",
    checkpoint_before: "cb", checkpoint_after: "ca", transaction_state: txState, reconciliation_state: reconState,
    evidence_path: (cfg.evidenceDir || "/ev") + "/" + job.job_id, timestamp: cfg.now || 0,
  };
}

export async function runHarness(cfg) {
  const ledger = [];
  const bindings = cfg.bindings || {};
  // 0. runtime kind must be explicit — REAL never infers test behavior.
  if (cfg.runtime_kind !== RUNTIME_KIND.REAL && cfg.runtime_kind !== RUNTIME_KIND.DETERMINISTIC_TEST) {
    return refuse("runtime_kind", "runtime_kind must be explicitly REAL or DETERMINISTIC_TEST");
  }
  // 0b. REAL mode: EVERY required production seam must be a non-null implementation (fail-closed).
  if (cfg.runtime_kind === RUNTIME_KIND.REAL) {
    const missing = REQUIRED_REAL_SEAMS.filter((s) => cfg[s] === undefined || cfg[s] === null);
    if (missing.length) return refuse("real_seam_check", missing.map((s) => "ACTIVATION_REFUSED: missing required REAL seam '" + s + "'"));
  }
  const w = makeWriters(cfg);
  // 1. load activation
  if (!cfg.activation) return refuse("load_activation", "no activation record");
  // 2/3/4/5. validate activation (three-layer candidate stack + backlog digests + provider identity + bounds)
  const av = validateActivationV3(cfg.activation, bindings);
  if (!av.valid) return refuse("validate_activation", av.refusals);
  if (authorityViolations().length) return refuse("controller_real_init", authorityViolations());
  // 6. acquire run lock
  if (cfg.lockManager) {
    const lk = cfg.lockManager.acquire(cfg.run_id, cfg.now);
    if (!lk.ok) return refuse("acquire_run_lock", lk.reason || "run lock unavailable (live run?)");
  }
  // 7. setup pipeline — fully READY (a failed step blocks all later)
  const setup = cfg.setupChecks ? runSetup(cfg.setupChecks, cfg.setupCtx || {}) : { ok: true, ready: true, results: [] };
  if (!setup.ready || !setup.ok) return refuse("setup_pipeline", "setup not ready: failed_step=" + (setup.failed_step || "?"), { setup });
  // 8. capability lease (task-scoped; per-job binding minted + revalidated at each dispatch)
  const lease = cfg.lease;
  const leaseShape = lease ? { ...lease, job_id: lease.job_id ?? "run-scope", branch: lease.branch ?? "run-scope", worktree: lease.worktree ?? "run-scope" } : lease;
  const lv = validateLease(leaseShape, { ...bindings, run_id: cfg.run_id });
  if (!lv.valid) return refuse("validate_capability_lease", lv.refusals);
  // 9. blast-radius budget
  const bv = validateBlastBudget(cfg.blast_budget);
  if (!bv.valid) return refuse("validate_blast_budget", bv.refusals);
  // 10. controller REAL init (a malformed backlog refuses fail-closed)
  const controller = new Controller({ run_id: cfg.run_id, mode: MODE.REAL, maxWidth: cfg.maxWidth || 2, now: cfg.now || 0, deadlineEpoch: cfg.deadlineEpoch || null });
  const loaded = controller.load(cfg.backlog || []);
  if (!loaded.ok) return refuse("controller_real_init", ["backlog invalid: " + JSON.stringify(loaded.errors)]);
  // an empty backlog only runs if the signed activation explicitly declares an intentional empty run
  if ((cfg.backlog || []).length === 0 && cfg.activation.intentional_empty_run !== true) return refuse("controller_real_init", ["empty backlog not signed as an intentional empty run"]);
  const replay = new ReplayStream(cfg.run_id);
  const txByKey = cfg.txByKey || {};
  cfg.__consumedLeases = cfg.__consumedLeases || new Set(); // run-scoped consumed single-use leases
  const usage = { ...zeroUsage() };
  const jobResults = {};
  const teardown = { locks_released: [], processes_accounted: [], teardown_verified: [] };
  w.recovery({ run_id: cfg.run_id, phase: "scheduling_start", setup_ready: true });
  w.nextSafeAction("run scheduling started; disk-recoverable");

  const running = new Set();
  let ticks = 0;
  const maxTicks = (cfg.backlog || []).length * 8 + 50;
  while (ticks++ < maxTicks) {
    const ctl = readControl(cfg);
    if (ctl.stop) { controller.runtime_state = "STOPPED_BY_STOP"; controller.stop_reason = "stop control observed"; w.nextSafeAction("stopped by control; no new work"); break; }
    if (ctl.pause) { controller.pause(); w.nextSafeAction("paused by control; resumable"); break; }
    refreshClock(cfg, controller);
    if (controller.deadlineEpoch && controller.now >= controller.deadlineEpoch) { controller.runtime_state = "STOPPED_DEADLINE"; controller.stop_reason = "hard deadline reached"; w.nextSafeAction("deadline reached; no new work"); break; }
    const pending = controller.jobs.filter((j) => j.status === "PENDING");
    const eligible = pending.filter((j) => isEligible(j, controller.ctx()));
    for (const j of pending) { const hold = Controller.structuralHold(j); if (hold && j.status === "PENDING") { j.status = "HELD"; j.hold_reason = hold; } }
    const chosen = [];
    for (const j of eligible) {
      if (running.size + chosen.length >= (cfg.maxWidth || 2)) break;
      if ([...chosen, ...[...running].map((id) => controller.byId.get(id))].some((o) => jobsCollide(j, o))) continue;
      chosen.push(j);
    }
    if (!chosen.length && running.size === 0) break;
    for (const j of chosen) {
      // re-read controls + clock between jobs (live pause/stop/deadline)
      const c2 = readControl(cfg);
      if (c2.stop) { controller.runtime_state = "STOPPED_BY_STOP"; break; }
      if (c2.pause) { controller.pause(); break; }
      refreshClock(cfg, controller);
      if (controller.deadlineEpoch && controller.now >= controller.deadlineEpoch) { controller.runtime_state = "STOPPED_DEADLINE"; controller.stop_reason = "hard deadline reached (between jobs)"; break; }
      j.status = "RUNNING"; running.add(j.job_id);
      if (!j.branch || j.branch === "main" || j.worktree === "/" || !j.worktree) { jobResults[j.job_id] = { job_id: j.job_id, state: "PARKED", reason: "invalid branch/worktree" }; running.delete(j.job_id); j.status = "PARKED"; continue; }
      const res = await runJobLifecycle(cfg, j, lease, cfg.blast_budget, usage, txByKey, replay, bindings, ledger, controller, w);
      jobResults[j.job_id] = res;
      running.delete(j.job_id);
      j.status = res.state === "COMPLETED" ? "COMPLETED" : (res.state.startsWith("HELD") || res.state.endsWith("_HELD")) ? "HELD" : "PARKED";
      // process-tree teardown verification per job
      if (typeof cfg.teardownVerifier === "function") { const t = await cfg.teardownVerifier(j); teardown.teardown_verified.push({ job_id: j.job_id, torn_down: !!(t && t.torn_down) }); }
      teardown.locks_released.push(j.job_id);
      w.recovery({ run_id: cfg.run_id, job_id: j.job_id, state: res.state });
      if (cfg.__teardownDefect) { controller.runtime_state = "STOPPED_TEARDOWN_DEFECT"; controller.stop_reason = "teardown defect — run stopped"; break; }
    }
    if (controller.runtime_state === "STOPPED_BY_STOP" || controller.runtime_state === "STOPPED_TEARDOWN_DEFECT" || controller.paused) break;
  }
  for (const j of controller.jobs) if (j.status === "PENDING") { const h = Controller.structuralHold(j); if (h) { j.status = "HELD"; j.hold_reason = h; } }
  const final_state = controller.runtime_state && controller.runtime_state.startsWith("STOPPED") ? controller.runtime_state
    : controller.paused ? "PAUSED" : "STOPPED_EXHAUSTED";
  if (cfg.lockManager) { cfg.lockManager.release(cfg.run_id); teardown.lock_file_released = true; }
  w.recovery({ run_id: cfg.run_id, phase: "final", final_state });
  w.nextSafeAction("run reached " + final_state + "; recoverable from disk");
  const completed = Object.values(jobResults).filter((r) => r.state === "COMPLETED");
  const parked = Object.values(jobResults).filter((r) => r.state === "PARKED");
  const held = controller.jobs.filter((j) => j.status === "HELD");
  const teardownDefect = !!cfg.__teardownDefect;
  const teardownClean = !teardownDefect && Object.values(jobResults).every((r) => r.state !== "HELD_TEARDOWN_DEFECT");
  const heldReconcile = Object.values(jobResults).some((r) => r.state === "HELD_RECONCILE");
  const checkerInsufficient = Object.values(jobResults).some((r) => r.checker_result === "INSUFFICIENT_EVIDENCE");
  // FG-LRCQ-ACT-008: truthful outcome. `ready`/activation-accepted alone is NOT a productive run.
  let outcome_status;
  if (teardownDefect) outcome_status = "HELD_TEARDOWN_DEFECT";
  else if (final_state === "STOPPED_DEADLINE") outcome_status = "CONTROLLED_DEADLINE_STOP";
  else if (final_state === "STOPPED_BY_STOP") outcome_status = "CONTROLLED_PAUSE";
  else if (final_state === "PAUSED") outcome_status = "CONTROLLED_PAUSE";
  else if (heldReconcile) outcome_status = "HELD_NEEDS_RECONCILIATION";
  else if (completed.length > 0 && teardownClean) outcome_status = "VERIFIED_PRODUCTIVE_RUN";
  else if (final_state === "STOPPED_EXHAUSTED" && completed.length === 0) outcome_status = "CONTROLLED_QUEUE_EXHAUSTION";
  else if (checkerInsufficient) outcome_status = "HELD_CHECKER_INSUFFICIENT_EVIDENCE";
  else outcome_status = "INSUFFICIENT_EVIDENCE";
  w.recovery({ run_id: cfg.run_id, phase: "outcome", final_state, outcome_status, productive_jobs_completed: completed.length });
  return {
    ready: true, refused: null, run_id: cfg.run_id, final_state, runtime_kind: cfg.runtime_kind,
    dispatched: Object.keys(txByKey).length > 0,
    jobResults, completed_count: completed.length, parked_count: parked.length,
    held_jobs: held.map((j) => ({ job_id: j.job_id, reason: j.hold_reason })),
    replay_ok: replay.verifyChain().ok, replay_len: replay.records.length,
    txRegistry: txByKey, usage, ledger, teardown,
    merged: false, accepted: false, pushed: false, protected_main_written: false,
    setup_ready: setup.ready,
    // FG-LRCQ-ACT-008 truthful run-outcome fields
    activation_accepted: true, run_started: Object.keys(txByKey).length > 0, controlled_stop: /^(STOPPED|PAUSED)/.test(final_state),
    productive_jobs_completed: completed.length, jobs_parked: parked.length, jobs_held: held.length,
    teardown_clean: teardownClean, teardown_defect: teardownDefect, evidence_complete: teardownClean,
    outcome_status, verified_productive_run: outcome_status === "VERIFIED_PRODUCTIVE_RUN",
    next_founder_gate: outcome_status === "VERIFIED_PRODUCTIVE_RUN" ? "review sealed evidence" : "review held/parked/stop reason",
  };
}

function zeroUsage() { return { max_files: 0, max_changed_lines: 0, max_branches: 0, max_worktrees: 0, max_external_calls: 0, max_recipients: 0, max_dollars: 0, max_records: 0, max_execution_s: 0, max_delegation_depth: 0, max_output_bytes: 0 }; }
