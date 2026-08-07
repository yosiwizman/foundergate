// FounderGate LRCQ — Autonomous Backlog & Queue Controller (Phase 5).
// NARROW-SENSITIVE. Single-writer. Default mode SIMULATION_ONLY.
//
// This controller PLANS and (in simulation) drives a wide-safe backlog. It NEVER:
//   - merges protected main            - approves its own work / signs a gate
//   - converts worker success -> accept/merge   - touches PR #182 or #186
//   - contacts M1 / touches AKIOR      - executes live actions or uses customer data
//   - invokes a real Claude worker unless a separate founder ACTIVATION RECORD is present
//
// Real provider execution requires an activation record NOT created here.
import { validateBacklog, findCycle, RUNTIME_STATES } from "./schemas.mjs";

export const MODE = { SIMULATION_ONLY: "SIMULATION_ONLY", REAL: "REAL" };

// ---- Eligibility: the fail-closed gate for what may auto-run ----------------
// A job is auto-eligible ONLY if every condition holds. Anything narrow/unknown/
// blocked/gated is HELD, never eligible.
export function eligibilityReason(job, ctx) {
  if (!job) return "no job";
  if (job.status === "COMPLETED" || job.status === "RUNNING" || job.status === "PARKED") return "not-pending:" + job.status;
  if (job.risk_class !== "WIDE_SAFE") return "HELD:risk_class=" + job.risk_class;
  if (job.gate_trigger && job.gate_trigger !== "NONE") return "HELD:gate=" + job.gate_trigger;
  if (job.effect_class === "LIVE_ACTION" || job.effect_class === "NETWORK") return "HELD:effect=" + job.effect_class;
  if (!Array.isArray(job.allowed_files) || job.allowed_files.length === 0) return "HELD:no-allowed-files";
  if (!Array.isArray(job.forbidden_files)) return "HELD:no-forbidden-files";
  if (!Array.isArray(job.tests) || job.tests.length === 0) return "HELD:no-tests";
  if (!Array.isArray(job.required_evidence) || job.required_evidence.length === 0) return "HELD:no-evidence-def";
  if (!job.checker_requirement) return "HELD:no-checker-req";
  // dependencies satisfied?
  for (const d of job.dependencies || []) {
    const dep = ctx.byId.get(d);
    if (!dep) return "BLOCKED:missing-dep:" + d;
    if (dep.status !== "COMPLETED") return "BLOCKED:dep-not-complete:" + d;
  }
  // file collision with any currently-active (RUNNING) lane? Directory-overlap aware:
  // a locked "src/a/" conflicts with a candidate "src/a/b.mjs" and vice-versa.
  const owners = ctx.activeFileOwners || new Map();
  for (const f of job.allowed_files) {
    for (const [locked, owner] of owners) {
      if (owner && owner !== job.job_id && pathsOverlap(f, locked)) return "HELD_COLLISION:file:" + f + ":overlaps:" + locked + ":owned-by:" + owner;
    }
  }
  // branch/worktree isolation
  if (job.branch && ctx.activeBranches && ctx.activeBranches.has(job.branch) && ctx.activeBranches.get(job.branch) !== job.job_id) return "HELD_COLLISION:branch:" + job.branch;
  if (job.worktree && ctx.activeWorktrees && ctx.activeWorktrees.has(job.worktree) && ctx.activeWorktrees.get(job.worktree) !== job.job_id) return "HELD_COLLISION:worktree:" + job.worktree;
  return "ELIGIBLE";
}
export function isEligible(job, ctx) { return eligibilityReason(job, ctx) === "ELIGIBLE"; }

// Directory-overlap-aware path comparison: two paths overlap if identical, or one is a
// directory prefix of the other. A path with no "." is treated as a directory. This is the
// SINGLE overlap authority used by BOTH the static collision matrix and the runtime lock.
export function pathsOverlap(a, b) {
  if (a === b) return true;
  const norm = (p) => (p.endsWith("/") ? p : p + (p.includes(".") ? "" : "/"));
  const da = norm(a), db = norm(b);
  if (a.endsWith("/") && b.startsWith(a)) return true;
  if (b.endsWith("/") && a.startsWith(b)) return true;
  if (da !== a && b.startsWith(da)) return true; // a is a dir (no dot) containing b
  if (db !== b && a.startsWith(db)) return true; // b is a dir (no dot) containing a
  return false;
}
// Two jobs collide if any of their allowed_files overlap (exact or directory-prefix).
export function jobsCollide(a, b) {
  for (const fa of a.allowed_files) for (const fb of b.allowed_files) if (pathsOverlap(fa, fb)) return true;
  return false;
}
// Full collision matrix over a job list.
export function collisionMatrix(jobs) {
  const pairs = [];
  for (let i = 0; i < jobs.length; i++) for (let j = i + 1; j < jobs.length; j++) {
    if (jobsCollide(jobs[i], jobs[j])) pairs.push([jobs[i].job_id, jobs[j].job_id]);
  }
  return pairs;
}

// ---- Deterministic fake provider -------------------------------------------
// Drives simulation with NO real worker. Job metadata declares its scripted outcome:
//   sim.outcome: "pass" | "fail_once" (fails until attempt==2) | "fail_always"
export function fakeProvider(job, attempt) {
  const sim = job.sim || { outcome: "pass" };
  if (sim.outcome === "fail_always") return { ok: false, reason: "scripted permanent failure" };
  if (sim.outcome === "fail_once") return attempt >= 2 ? { ok: true } : { ok: false, reason: "scripted transient failure (attempt " + attempt + ")" };
  return { ok: true };
}

// ---- Disabled real provider adapter ----------------------------------------
// Compatibility-prepared ONLY. Refuses unless a complete, non-stale founder
// activation record is supplied. NEVER invokes Claude here; NEVER reads credentials;
// NEVER weakens permissions.
export function realProviderAdapter(activation, bindings) {
  const missing = [];
  if (!activation) return { enabled: false, refused: "no activation record", invoked: false };
  for (const k of ["candidate_sha", "candidate_tree", "run_deadline_epoch", "backlog_digest", "allowed_tools", "denied_tools", "max_parallel_width", "provider", "founder_signature"]) {
    if (activation[k] === undefined || activation[k] === null || activation[k] === "") missing.push(k);
  }
  if (missing.length) return { enabled: false, refused: "activation record missing: " + missing.join(","), invoked: false };
  if (bindings && activation.candidate_sha !== bindings.candidate_sha) return { enabled: false, refused: "candidate_sha mismatch (stale activation)", invoked: false };
  if (bindings && activation.backlog_digest !== bindings.backlog_digest) return { enabled: false, refused: "backlog_digest mismatch (stale activation)", invoked: false };
  if (activation.dangerously_skip_permissions) return { enabled: false, refused: "permission-weakening flag rejected", invoked: false };
  // Even with a complete record, THIS module still does not invoke Claude — activation
  // is a separate, later, founder-gated operation. We only report that it *would* be admissible.
  return { enabled: false, admissible: true, invoked: false, note: "activation record complete; real execution is a separate founder-gated operation, not performed here" };
}

// ---- Controller ------------------------------------------------------------
export class Controller {
  constructor(opts = {}) {
    this.mode = opts.mode || MODE.SIMULATION_ONLY;
    this.run_id = opts.run_id || null;
    this.maxWidth = opts.maxWidth || 3;
    this.deadlineEpoch = opts.deadlineEpoch || null;
    this.paused = false;
    this.jobs = [];
    this.events = [];
    this.runtime_state = "PREPARATION";
    this.stop_reason = null;
    this.gate = null;
    this.seq = 0;
    this.now = opts.now || 0; // injected clock (seconds); pure/deterministic
    this.locks = new Map(); // file -> job_id (one-writer)
    this.activeBranches = new Map();
    this.activeWorktrees = new Map();
    this.sealed = new Set(); // job_ids whose evidence is sealed
  }
  // Structural hold: reasons a job may NEVER become auto-eligible (independent of deps).
  static structuralHold(j) {
    if (j.risk_class !== "WIDE_SAFE") return "HELD:risk_class=" + j.risk_class;
    if (j.gate_trigger && j.gate_trigger !== "NONE") return "HELD:gate=" + j.gate_trigger;
    if (j.effect_class === "LIVE_ACTION" || j.effect_class === "NETWORK") return "HELD:effect=" + j.effect_class;
    return null;
  }
  load(jobs) {
    const v = validateBacklog(jobs);
    if (!v.ok) return { ok: false, errors: v.errors };
    // duplicate-run prevention: refuse re-load into a running controller
    if (this.runtime_state === "RUNNING") return { ok: false, errors: [{ errors: ["controller already running"] }] };
    this.jobs = jobs.map((j) => {
      const hold = Controller.structuralHold(j);
      return { ...j, status: j.status && j.status !== "PENDING" ? j.status : (hold ? "HELD" : "PENDING"), status_reason: hold || j.status_reason || null, correction_cycle: j.correction_cycle || 0, attempts: 0 };
    });
    this.byId = new Map(this.jobs.map((j) => [j.job_id, j]));
    this.runtime_state = "READY";
    return { ok: true };
  }
  // Mark PENDING jobs whose dependency is PARKED/FAILED as permanently BLOCKED.
  settleBlocked() {
    for (const j of this.jobs) {
      if (j.status !== "PENDING") continue;
      for (const d of j.dependencies || []) {
        const dep = this.byId.get(d);
        if (dep && (dep.status === "PARKED" || dep.status === "FAILED" || dep.status === "BLOCKED")) {
          j.status = "BLOCKED"; j.status_reason = "dependency " + d + " is " + dep.status;
          break;
        }
      }
    }
  }
  ctx() {
    const activeFileOwners = new Map();
    for (const [f, id] of this.locks) activeFileOwners.set(f, id);
    return { byId: this.byId, activeFileOwners, activeBranches: this.activeBranches, activeWorktrees: this.activeWorktrees };
  }
  emit(job_id, event_type, status, evidence) {
    this.seq += 1;
    this.events.push({ event_id: (this.run_id || "run") + "-" + this.seq, run_id: this.run_id, job_id, timestamp: this.now, source: "controller", event_type, status, evidence: evidence || null });
  }
  eligibleNow() { return this.jobs.filter((j) => j.status === "PENDING" && isEligible(j, this.ctx())); }
  runningCount() { return this.jobs.filter((j) => j.status === "RUNNING").length; }
  // Refill: move eligible jobs to RUNNING up to maxWidth, acquiring one-writer locks.
  // No refill when paused, past deadline, or a founder/human-expert gate is held.
  refill() {
    if (this.paused) return { refilled: 0, reason: "paused" };
    if (this.deadlineEpoch && this.now >= this.deadlineEpoch) { this.runtime_state = "STOPPED_DEADLINE"; this.stop_reason = "deadline reached — no new scheduling"; return { refilled: 0, reason: "deadline" }; }
    if (this.gate) return { refilled: 0, reason: "gate:" + this.gate.gate_type };
    let n = 0;
    while (this.runningCount() < this.maxWidth) {
      const cand = this.eligibleNow()[0];
      if (!cand) break;
      // acquire locks (raw allowed_files; overlap tested via pathsOverlap at check time)
      for (const f of cand.allowed_files) this.locks.set(f, cand.job_id);
      if (cand.branch) this.activeBranches.set(cand.branch, cand.job_id);
      if (cand.worktree) this.activeWorktrees.set(cand.worktree, cand.job_id);
      cand.status = "RUNNING"; cand.started_at = this.now; cand.attempts += 1;
      this.emit(cand.job_id, "job_started", "RUNNING");
      n += 1;
    }
    if (this.runtime_state === "READY" && n > 0) this.runtime_state = "RUNNING";
    return { refilled: n };
  }
  releaseLocks(job) {
    for (const f of job.allowed_files) if (this.locks.get(f) === job.job_id) this.locks.delete(f);
    if (job.branch && this.activeBranches.get(job.branch) === job.job_id) this.activeBranches.delete(job.branch);
    if (job.worktree && this.activeWorktrees.get(job.worktree) === job.job_id) this.activeWorktrees.delete(job.worktree);
  }
  // Complete a running job via the fake provider; handle correction cycles / parking.
  step(job_id) {
    const j = this.byId.get(job_id);
    if (!j || j.status !== "RUNNING") return { ok: false, reason: "not running" };
    const res = this.mode === MODE.SIMULATION_ONLY ? fakeProvider(j, j.attempts) : { ok: false, reason: "REAL mode requires activation — not performed" };
    if (res.ok) {
      // seal evidence BEFORE final state (recovery-safe ordering)
      this.sealed.add(j.job_id);
      this.emit(j.job_id, "evidence_sealed", "OK");
      j.status = "COMPLETED"; j.completed_at = this.now;
      this.emit(j.job_id, "job_completed", "COMPLETED");
      this.releaseLocks(j);
    } else {
      j.correction_cycle = (j.correction_cycle || 0) + 1;
      this.emit(j.job_id, "job_failed", "FAILED", res.reason);
      if (j.correction_cycle >= (j.max_attempts || 3)) {
        j.status = "PARKED"; j.status_reason = "parked after " + j.correction_cycle + " failed cycles: " + res.reason;
        this.emit(j.job_id, "job_parked", "PARKED");
        this.releaseLocks(j);
      } else {
        // bounded retry: back to PENDING to be re-refilled
        j.status = "PENDING";
        this.releaseLocks(j);
      }
    }
    return { ok: true, status: j.status };
  }
  pause() { this.paused = true; this.runtime_state = "PAUSED"; this.emit(null, "pause_requested", "PAUSED"); }
  resume() { this.paused = false; if (this.runtime_state === "PAUSED") this.runtime_state = "RUNNING"; }
  // Gate barrier: hold before any founder/human-expert/merge gate; never auto-cross.
  raiseGate(gate_type, reason, blocked_action, next_safe_action) {
    this.gate = { gate_type, reason, blocked_action, required_human: gate_type.includes("FOUNDER") ? "founder" : gate_type.includes("HUMAN") ? "human-expert" : "n/a", current_sha: this.run_id, evidence_packet: null, reversible: true, next_safe_action };
    this.runtime_state = gate_type.includes("FOUNDER") ? "HELD_FOUNDER_GATE" : gate_type.includes("HUMAN") ? "HELD_HUMAN_EXPERT_GATE" : "HELD_COLLISION";
    this.emit(null, "gate_raised", this.runtime_state, reason);
  }
  // Deterministic final-state resolver. Terminal when nothing is RUNNING and no
  // PENDING job is eligible; remaining HELD/BLOCKED jobs are surfaced, never run.
  resolveFinal() {
    if (this.runtime_state === "STOPPED_DEADLINE") return "STOPPED_DEADLINE";
    if (this.paused) return "PAUSED";
    if (this.gate) return this.runtime_state;
    this.settleBlocked();
    if (this.runningCount() > 0) return this.runtime_state;
    if (this.eligibleNow().length > 0) return this.runtime_state; // refill will pick them up
    // No running, nothing eligible → auto-safe queue is drained.
    const heldFounder = this.jobs.filter((j) => j.status === "HELD" && j.gate_trigger === "FOUNDER_GATE");
    const heldHuman = this.jobs.filter((j) => j.status === "HELD" && j.gate_trigger === "HUMAN_EXPERT_GATE");
    const held = this.jobs.filter((j) => j.status === "HELD");
    const blocked = this.jobs.filter((j) => j.status === "BLOCKED");
    this.runtime_state = "STOPPED_EXHAUSTED";
    this.stop_reason = "auto-safe queue drained — " + this.jobs.filter((j) => j.status === "COMPLETED").length + " completed, " +
      this.jobs.filter((j) => j.status === "PARKED").length + " parked, " + held.length + " held (" + heldFounder.length + " founder-gate, " +
      heldHuman.length + " human-expert), " + blocked.length + " blocked. Held/blocked jobs are NEVER auto-run.";
    return this.runtime_state;
  }
  // Snapshot for the console projection (durable, disk-serializable).
  snapshot() {
    return {
      run_id: this.run_id, runtime_state: this.runtime_state, stop_reason: this.stop_reason,
      gate: this.gate, jobs: this.jobs, events: this.events, mode: this.mode,
      merged: false, accepted: false, // NEVER inferred from completion
      max_width: this.maxWidth, deadline_epoch: this.deadlineEpoch, paused: this.paused,
      sealed_jobs: [...this.sealed],
    };
  }
  // Drive the whole simulation to a stable final state (bounded).
  runToCompletion(maxTicks = 10000) {
    let ticks = 0;
    this.refill();
    while (ticks < maxTicks) {
      ticks += 1;
      const running = this.jobs.filter((j) => j.status === "RUNNING");
      if (running.length === 0) { this.refill(); }
      const stillRunning = this.jobs.filter((j) => j.status === "RUNNING");
      if (stillRunning.length === 0) { this.resolveFinal(); break; }
      // deterministic: step the first running job, then refill
      this.step(stillRunning[0].job_id);
      this.refill();
      this.resolveFinal();
      if (this.runtime_state === "STOPPED_EXHAUSTED" || this.runtime_state === "STOPPED_DEADLINE" || this.gate) break;
    }
    this.resolveFinal();
    return { ticks, final: this.runtime_state };
  }
}
