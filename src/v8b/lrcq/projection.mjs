// FounderGate LRCQ — pure founder-readable projection (Phase 4E).
// Converts disk-backed controller state into the complete console view model.
// REUSES the accepted PR #183 observability truth (heartbeat/lifecycle/event-scoping).
// There is NO second observability authority here — heartbeat age, lifecycle precedence,
// and run-id scoping all come from ../../observability/status-core.mjs.
import { normalizeHeartbeatAge, resolveLifecycle, scopeEvents, branchActivityIsLiveness } from "../../observability/status-core.mjs";

// Honest acceptance-boundary statements the console must always surface.
export const ACCEPTANCE_BOUNDARY = [
  "Worker completion is not feature acceptance.",
  "Queue exhaustion is not product acceptance.",
  "Test success is not merge authority.",
  "UNKNOWN is not green.",
  "STALE is not current.",
  "HELD is not accepted.",
];

const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const secToH = (s) => (s == null ? null : Math.round((s / 3600) * 100) / 100);

// Bucket jobs by status into the queue view (never infers acceptance/merge from completion).
function bucket(jobs) {
  const b = { ready: [], running: [], completed: [], failed: [], held: [], parked: [], blocked: [], unknown: [], pending: [] };
  const map = { READY: "ready", RUNNING: "running", COMPLETED: "completed", FAILED: "failed", HELD: "held", PARKED: "parked", BLOCKED: "blocked", UNKNOWN: "unknown", PENDING: "pending" };
  for (const j of jobs || []) { const k = map[j.status] || "unknown"; b[k].push(j.job_id); }
  return b;
}

// state: { run_id, runtime_state, started_at, deadline, max_window_s, elapsed_s, final_duration_s,
//          heartbeat, handoff, cost, cost_ceiling, runtime_ceiling_s, stop_reason, gate, jobs[], events[],
//          config, merged, accepted }
export function projectConsole(state, nowMs) {
  const s = state || {};
  const life = resolveLifecycle({ state: s.runtime_state ? { state: s.runtime_state } : null, handoff: s.handoff });
  const beat = normalizeHeartbeatAge(s.heartbeat, nowMs);
  const scope = scopeEvents(s.events, s.run_id ?? null);
  const b = bucket(s.jobs);
  const gate = s.gate || null;
  const heldFounderJobs = (s.jobs || []).filter((j) => j.status === "HELD" && j.gate_trigger === "FOUNDER_GATE").map((j) => j.job_id);
  const heldHumanJobs = (s.jobs || []).filter((j) => j.status === "HELD" && j.gate_trigger === "HUMAN_EXPERT_GATE").map((j) => j.job_id);
  const founderActionRequired = (!!gate && typeof gate.gate_type === "string" && gate.gate_type.includes("FOUNDER")) || heldFounderJobs.length > 0;

  return {
    // identity + time
    run_id: s.run_id ?? "UNKNOWN",
    evaluated_sha: s.evaluated_sha ?? "UNKNOWN",
    evidence_sha: s.evidence_sha ?? "UNKNOWN",
    authorized_start: s.started_at ?? "UNKNOWN",
    hard_deadline: s.deadline ?? "UNKNOWN",
    max_authorization_window_hours: secToH(num(s.max_window_s)) ?? "UNKNOWN",
    actual_elapsed_hours: secToH(num(s.elapsed_s)) ?? "UNKNOWN",
    final_runtime_hours: s.final_duration_s != null ? secToH(num(s.final_duration_s)) : (life.is_final ? secToH(num(s.elapsed_s)) : "not final yet"),
    configured_runtime_ceiling_hours: secToH(num(s.runtime_ceiling_s)) ?? "UNKNOWN",
    configured_cost_ceiling: s.cost_ceiling != null ? s.cost_ceiling : "none configured",
    // lifecycle + heartbeat (from PR#183 truth)
    lifecycle_state: life.lifecycle_state,
    lifecycle_display: life.lifecycle_display,
    lifecycle_source: life.source,
    historical_launch_marker: life.historical_launch_evidence,
    is_final: life.is_final,
    heartbeat_status: beat.status,
    heartbeat_age_seconds: beat.ageSeconds,
    heartbeat_unit: beat.unit,
    // queues
    current_job: s.current_job ?? (b.running[0] ?? "none"),
    queue_depth: (s.jobs || []).length,
    eligible_jobs: b.ready,
    blocked_dependency_jobs: b.blocked,
    running_jobs: b.running,
    completed_jobs: b.completed,
    failed_jobs: b.failed,
    held_jobs: b.held,
    unknown_jobs: b.unknown,
    parked_jobs: b.parked,
    pending_jobs: b.pending,
    correction_cycle_counts: (s.jobs || []).reduce((a, j) => { if (j.correction_cycle) a[j.job_id] = j.correction_cycle; return a; }, {}),
    // events (scoped)
    current_events: scope.current.length,
    historical_events: scope.historical.length,
    legacy_unscoped_events: scope.legacy_unscoped,
    // stop / gate / next
    stop_reason: s.stop_reason ?? (life.is_final ? life.lifecycle_display : "not stopped"),
    next_safe_action: s.next_safe_action ?? "UNKNOWN",
    founder_action_required: founderActionRequired,
    held_founder_gate_jobs: heldFounderJobs,
    held_human_expert_jobs: heldHumanJobs,
    gate_reason: gate ? gate.reason : (heldFounderJobs.length ? "founder-gate job(s) held: " + heldFounderJobs.join(",") : "none"),
    evidence_links: s.evidence_links || [],
    branch_worktree_assignments: (s.jobs || []).filter((j) => j.branch || j.worktree).map((j) => ({ job: j.job_id, branch: j.branch || "UNKNOWN", worktree: j.worktree || "UNKNOWN" })),
    // cost (UNKNOWN when unavailable — never a fake number)
    current_cost: s.cost != null && Number.isFinite(s.cost) ? s.cost : "UNKNOWN",
    // acceptance boundary — NEVER inferred from worker success
    any_output_merged: s.merged === true ? true : (s.merged === false ? false : "UNKNOWN"),
    any_output_accepted: s.accepted === true ? true : (s.accepted === false ? false : "UNKNOWN"),
    build_vs_accept: "outputs may be BUILT or WORKER-COMPLETED; that is NOT accepted and NOT merged",
    branch_activity_is_liveness: branchActivityIsLiveness(),
    acceptance_boundary: ACCEPTANCE_BOUNDARY,
  };
}
