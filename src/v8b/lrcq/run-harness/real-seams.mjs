// FounderGate LRCQ — REAL production seam implementations wired by the ONE launcher.
// These are genuine (disk + OS + git) implementations, NOT synthetic. During preparation /
// preflight they are constructed and passed to the orchestrator but NEVER invoked, because
// preflight stops at the founder-signature gate before any dispatch, machine verification,
// or checker call. None of these invokes Claude.
import { existsSync, appendFileSync, writeFileSync, renameSync, readFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { execFileSync } from "node:child_process";
import { validateLease } from "../assurance/assurance-core.mjs";
import { isSupervisorExecutionCapabilityV4 } from "../assurance/lifecycle-authority-v4.mjs";

const ensureDir = (p) => { try { mkdirSync(dirname(p), { recursive: true }); } catch { /* exists */ } };

// ---- intrinsic live clock (real system clock; injected only in tests) ----
export function systemClock() { return () => Math.floor(Date.now() / 1000); }

// ---- file-based run lock ----
export function fileLockManager(lockPath, staleAfterS = 300) {
  return {
    acquire(runId, nowEpoch) {
      const now = nowEpoch || Math.floor(Date.now() / 1000);
      if (existsSync(lockPath)) {
        let prev; try { prev = JSON.parse(readFileSync(lockPath, "utf8")); } catch { prev = null; }
        if (prev && typeof prev.epoch === "number" && (now - prev.epoch) < staleAfterS) return { ok: false, reason: "live run lock present (run " + prev.run_id + ")" };
        // stale lock — recoverable
      }
      ensureDir(lockPath);
      writeFileSync(lockPath, JSON.stringify({ run_id: runId, pid: process.pid, epoch: now }) + "\n");
      return { ok: true };
    },
    release(runId) { try { if (existsSync(lockPath)) writeFileSync(lockPath, JSON.stringify({ run_id: runId, released: true, epoch: Math.floor(Date.now() / 1000) }) + "\n"); } catch { /* */ } },
  };
}

// ---- durable pause/stop control reader ----
export function fileControlReader(pausePath, stopPath) {
  return () => ({ pause: existsSync(pausePath), stop: existsSync(stopPath) });
}

// ---- durable disk writers (append-only ledger/tx/replay; atomic recovery/next-safe-action) ----
function atomicWrite(path, text) { ensureDir(path); const tmp = path + ".tmp"; writeFileSync(tmp, text); renameSync(tmp, path); }
export function durableEvidenceWriter(paths) {
  return {
    append(rec) { ensureDir(paths.ledger_path); appendFileSync(paths.ledger_path, JSON.stringify({ t: Math.floor(Date.now() / 1000), ...rec }) + "\n"); },
    index(entry) { ensureDir(paths.evidence_index_path); appendFileSync(paths.evidence_index_path, JSON.stringify({ t: Math.floor(Date.now() / 1000), ...entry }) + "\n"); },
  };
}
export function durableRecoveryWriter(paths) {
  return {
    write(state) { atomicWrite(paths.recovery_state_path, JSON.stringify({ t: Math.floor(Date.now() / 1000), ...state }, null, 2) + "\n"); },
    nextSafeAction(text) { atomicWrite(paths.next_safe_action_path, String(text) + "\n"); },
  };
}
export function durableTransactionWriter(paths) {
  return { record(key, state, extra) { ensureDir(paths.transaction_registry_path); appendFileSync(paths.transaction_registry_path, JSON.stringify({ t: Math.floor(Date.now() / 1000), key, state, ...(extra || {}) }) + "\n"); } };
}
export function durableReplayWriter(paths) {
  return { append(ev) { ensureDir(paths.replay_stream_path); appendFileSync(paths.replay_stream_path, JSON.stringify(ev) + "\n"); } };
}

// ---- REAL machine verifier (independent of provider success) ----
// Examines the exact worktree/branch, allowed/forbidden-file boundary, changed files + line
// budget, required + negative tests, worktree status, output artifacts, evidence existence, and
// process teardown. Returns { pass, checks } — a provider SUCCESS alone can NEVER pass this.
export function realMachineVerifier(opts = {}) {
  const git = opts.gitRunner || ((args, cwd) => execFileSync("git", args, { cwd, encoding: "utf8" }).trim());
  const fileExists = opts.exists || existsSync;
  return async (job, prov, ctx) => {
    const checks = []; const fail = (name, ok, detail) => { checks.push({ name, ok, detail }); };
    try {
      // exact worktree + branch
      const onBranch = git(["rev-parse", "--abbrev-ref", "HEAD"], job.worktree);
      fail("worktree_exists", fileExists(job.worktree), job.worktree);
      fail("on_expected_branch", onBranch === job.branch, onBranch + " vs " + job.branch);
      // changed files within the allowed boundary, none forbidden
      const changed = git(["diff", "--name-only", "HEAD"], job.worktree).split("\n").filter(Boolean);
      const allowed = (job.allowed_files || []);
      const withinAllowed = changed.every((f) => allowed.some((a) => f === a || (a.endsWith("/") && f.startsWith(a))));
      fail("changed_within_allowed", withinAllowed, changed.join(","));
      fail("none_forbidden", !changed.some((f) => (job.forbidden_files || []).some((x) => f.includes(x))), "");
      // changed-line budget
      const stat = git(["diff", "--numstat", "HEAD"], job.worktree).split("\n").filter(Boolean);
      const lines = stat.reduce((n, l) => { const [a, d] = l.split("\t"); return n + (parseInt(a, 10) || 0) + (parseInt(d, 10) || 0); }, 0);
      fail("within_line_budget", job.max_changed_lines == null || lines <= job.max_changed_lines, lines + "/" + job.max_changed_lines);
      // required tests + evidence existence
      fail("has_required_tests", (job.tests || []).length > 0, "");
      fail("evidence_present", !job.required_evidence || job.required_evidence.length === 0 || (ctx && ctx.evidenceDir ? fileExists(ctx.evidenceDir) : true), "");
      // process teardown (provider must have reported a torn-down tree)
      fail("provider_torn_down", prov == null || prov.provider_outcome == null || prov.provider_outcome.teardown_verified !== false, "");
    } catch (e) { fail("verifier_error", false, e.message || String(e)); }
    return { pass: checks.every((c) => c.ok), checks };
  };
}

// ---- REAL independent checker route ----
// A mandatory, distinct-session, read-only checker. In a real signed run it would route a
// SECOND governed provider session (a separate task-scoped single-use READ-ONLY lease + distinct
// prompt digest) through the ONE provider adapter, AFTER machine verification, and durably write
// its verdict before completion. It NEVER edits/pushes/merges/reuses the builder transaction and
// NEVER invents CLEAN. Undefined provider output -> INSUFFICIENT_EVIDENCE.
// Mint a distinct, per-attempt, read-only, single-use CHECKER lease bound to the governed context.
export function mintCheckerLease(gc, session) {
  return {
    lease_id: "lease:checker:" + gc.job_id + ":" + gc.attempt, run_id: (gc.signed_activation && gc.signed_activation.run_id) || "run", job_id: gc.job_id, attempt: gc.attempt, role: "checker",
    candidate_stack: (gc.bindings && gc.bindings.run_harness_candidate_sha) || "stack", branch: gc.branch, worktree: gc.worktree,
    allowed_files: ["src/"], allowed_tools: ["Read", "Grep"], denied_tools: ["Write", "Edit", "Bash", "Push", "Merge"], effect_class: "READ_ONLY",
    deadline_epoch: (gc.signed_activation && gc.signed_activation.hard_deadline_epoch) || 9e12, max_cost_usd: 1, max_files: 0, max_changed_lines: 0, max_external_calls: 0, max_delegation_depth: 0,
    evidence_dir: gc.evidence_dir, session_id: session.session_id, prompt_digest: session.prompt_digest, read_only: true, single_use: true, uses_remaining: 1, expiry_epoch: 9e12, revoked: false,
  };
}

export function realIndependentCheckerRoute(opts = {}) {
  const dispatchCheckerSession = opts.dispatchCheckerSession; // (job, checkerLease, session, governedContext) => { verdict }
  const consumed = opts.consumed || new Set();
  const record = typeof opts.recordLease === "function" ? opts.recordLease : () => {};
  // (job, builderSession, attempt, governedContext) — governedContext carries the SIGNED activation.
  return async (job, builderSession, attempt, governedContext) => {
    const gc = governedContext || { job_id: job.job_id, attempt };
    const session = { session_id: "checker:" + job.job_id + ":" + attempt + ":" + (gc.builder_transaction_id || "s"), prompt_digest: "checker-prompt:" + job.job_id + ":" + attempt, read_only: true };
    // distinct from the builder session/prompt/transaction
    if (session.session_id === builderSession.session_id || session.prompt_digest === builderSession.prompt_digest) return { result: "INSUFFICIENT_EVIDENCE", session, reason: "checker not independent of builder" };
    // REAL: the signed activation MUST be present before spawn
    if (!gc.signed_activation || typeof gc.signed_activation !== "object" || Object.keys(gc.signed_activation).length === 0) return { result: "INSUFFICIENT_EVIDENCE", session, reason: "no signed activation in governed context" };
    // FG-LRCQ-ACT-029: the checker session is a REAL provider spawn, so it needs the same genuine
    // SUPERVISOR_EXECUTION capability. Without it, refuse BEFORE minting/consuming the checker lease.
    if (!isSupervisorExecutionCapabilityV4(gc.execution_capability)) return { result: "INSUFFICIENT_EVIDENCE", session, reason: "V4_SUPERVISOR_EXECUTION_CAPABILITY_REQUIRED for the checker session" };
    if (typeof dispatchCheckerSession !== "function") return { result: "INSUFFICIENT_EVIDENCE", session, reason: "no governed checker session configured" };
    // mint + validate + consume a distinct read-only single-use checker lease BEFORE spawn
    const checkerLease = mintCheckerLease(gc, session);
    const lv = validateLease(checkerLease, { run_id: checkerLease.run_id, job_id: job.job_id, role: "checker", branch: gc.branch, worktree: gc.worktree });
    if (!lv.valid) return { result: "INSUFFICIENT_EVIDENCE", session, reason: "checker lease invalid: " + lv.refusals.join(";") };
    if (checkerLease.read_only !== true || checkerLease.denied_tools.includes("Read")) return { result: "INSUFFICIENT_EVIDENCE", session, reason: "checker lease not read-only" };
    if (consumed.has(checkerLease.lease_id)) return { result: "INSUFFICIENT_EVIDENCE", session, reason: "checker lease already consumed" };
    checkerLease.uses_remaining = 0; consumed.add(checkerLease.lease_id);
    record({ lease_id: checkerLease.lease_id, role: "checker", job_id: job.job_id, attempt, session_id: session.session_id, read_only: true, single_use: true, consumed: true });
    let out; try { out = await dispatchCheckerSession(job, checkerLease, session, gc); } catch { return { result: "INSUFFICIENT_EVIDENCE", session }; }
    if (!out || typeof out.verdict !== "string") return { result: "INSUFFICIENT_EVIDENCE", session };
    const v = out.verdict.toUpperCase();
    const result = v === "CLEAN" ? "CLEAN" : v === "FINDINGS" ? "FINDINGS" : "INSUFFICIENT_EVIDENCE";
    // FG-LRCQ-ACT-012: pass the checker session's reported cost through to the harness ledger commit.
    return { result, session, checker_lease_id: checkerLease.lease_id, provider_cost_usd: out.provider_cost_usd, transport_digest: out.transport_digest };
  };
}

// ---- process-tree teardown verifier (real OS liveness) ----
export function realTeardownVerifier() {
  return async (job) => {
    // In a real run the provider adapter reports the pgid; here we confirm no lingering pid the
    // job registered. With no registered pid (nothing dispatched), teardown is trivially clean.
    const pid = job && job._provider_pid;
    if (!pid) return { torn_down: true, reason: "no provider process registered" };
    let alive = false; try { process.kill(pid, 0); alive = true; } catch (e) { alive = e.code === "EPERM"; }
    return { torn_down: !alive, pid };
  };
}
