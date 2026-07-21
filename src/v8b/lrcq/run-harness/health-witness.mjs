// FounderGate LRCQ — read-only launch-health WITNESS (FG-LRCQ-ACT-016/018/020). After a run is launched,
// this OBSERVES the existing run for a bounded window (12 min in production; accelerated + deterministic in
// tests) and reports whether the reviewed operational controls are functioning. It NEVER launches, restarts,
// repairs, invokes the provider, extends the deadline, writes run state, or mutates anything. It only reads
// snapshots + evidence + process state.
//
// ACTIVE-RUN SEMANTICS (FG-LRCQ-ACT-020):
//   HEALTHY_CONTINUE   — the run is STILL RUN_ACTIVE + alive at window end, with progress (or inside bounded
//                        grace) and no boundary breach. "CONTINUE" means the same run genuinely keeps going.
//   COMPLETED_HEALTHY  — the run reached a SUCCESSFUL terminal state (queue drained) with no boundary breach.
//                        A completed run NEVER returns HEALTHY_CONTINUE.
//   HELD               — a controlled hold/stop (deadline/budget/stop/HELD terminal) or a genuine STALL
//                        (RUN_ACTIVE but no progress across the whole window).
//   FAILED             — a boundary/identity/lineage/corruption/deadline/dead-supervisor breach.
//   INSUFFICIENT_EVIDENCE — required state is absent/unreadable.
//
// Progress is derived from DURABLE / CUMULATIVE signals across the window (authoritative evidence-index
// growth OR a provider child observed at ANY poll OR heartbeat advance), NEVER from a single final-snapshot
// child PID. A legitimate between-job / machine-verify gap (zero provider children at some polls) does not
// fail as long as some progress signal moved during the window.
export const WITNESS_SCHEMA = "lrcq-health-witness-2";

// opts.snapshot(i) -> a read-only observation object:
//   { supervisor: {run_id, supervisor_pid, immutable_hard_deadline_epoch, state, heartbeat_epoch,
//                  activation_id, process_start_identity},
//     supervisor_alive: bool, duplicate_supervisors: int, consumed: bool (activation replay-blocked),
//     queue_total: int, queue_initial_expected: int, provider_child_present: bool,
//     provider_identity: str, provider_expected_identity: str, provider_descendant_of_supervisor: bool,
//     escaped_processes: int, first_worktree_in_authorized_root: bool, evidence_index_count: int,
//     cost_spent_usd: num, cost_ceiling_usd: num, cost_reservation_exceeded: bool, missing_cost_held: bool,
//     protected_main_sha: str, protected_main_baseline_sha: str, akior_or_m1_access: bool,
//     customer_or_prod_access: bool, merge_push_deploy_send_payment: bool, crash_count: int,
//     second_provider_route: bool, second_executor: bool, terminal_state: str|null }
export async function witnessHealth(opts = {}) {
  const snapshot = opts.snapshot; if (typeof snapshot !== "function") return { result: "INSUFFICIENT_EVIDENCE", reason: "no snapshot source" };
  const polls = Math.max(1, opts.polls || 12);
  const sleep = opts.sleep || ((ms) => new Promise((r) => setTimeout(r, ms)));
  const pollMs = typeof opts.pollMs === "number" ? opts.pollMs : 60000; // 12 * 60s = 12 min in production

  const seen = [];
  for (let i = 0; i < polls; i++) { seen.push(snapshot(i)); if (i < polls - 1) await sleep(pollMs); }
  const first = seen[0], last = seen[seen.length - 1];
  if (!last || !last.supervisor) return { result: "INSUFFICIENT_EVIDENCE", reason: "no readable supervisor snapshot", schema: WITNESS_SCHEMA, read_only: true };

  const sup = (s) => s.supervisor || {};
  const num = (v) => (typeof v === "number" ? v : undefined);
  const runState = sup(last).state;
  const runActiveAtEnd = last.supervisor_alive === true && runState === "RUN_ACTIVE";
  const terminalState = last.terminal_state || (runState && runState !== "RUN_ACTIVE" ? runState : null);
  const successfulTerminal = !!terminalState && /STOPPED_EXHAUSTED/.test(terminalState);
  const controlledTerminal = !!terminalState && /(STOPPED_DEADLINE|CONTROLLED_BUDGET_STOP|STOPPED_BY_STOP|HELD)/.test(terminalState);
  const failedTerminal = !!terminalState && /FAILED/.test(terminalState);

  // Cumulative progress across the window (never a single final child PID).
  const hb0 = num(sup(first).heartbeat_epoch), hb1 = num(sup(last).heartbeat_epoch);
  const heartbeatAdvanced = typeof hb0 === "number" && typeof hb1 === "number" && hb1 > hb0;
  const ev0 = num(first.evidence_index_count), ev1 = num(last.evidence_index_count);
  const evidenceAdvanced = typeof ev0 === "number" && typeof ev1 === "number" && ev1 > ev0;
  const providerSeen = seen.some((s) => s.provider_child_present === true);
  const progressed = heartbeatAdvanced || evidenceAdvanced || providerSeen;

  const checks = []; const add = (n, ok) => checks.push({ name: n, ok: !!ok });
  const stable = (f) => seen.every((s) => f(s) === f(first));

  // Boundary-critical (any failure => FAILED).
  add("run_id_stable", stable((s) => sup(s).run_id) && !!sup(last).run_id);
  add("immutable_deadline_unchanged", stable((s) => sup(s).immutable_hard_deadline_epoch));
  add("process_start_identity_stable", stable((s) => sup(s).process_start_identity));
  add("supervisor_alive_when_active", runState !== "RUN_ACTIVE" || last.supervisor_alive === true);
  add("no_duplicate_supervisor", seen.every((s) => (s.duplicate_supervisors || 0) <= 0));
  add("provider_identity_matches", !last.provider_identity || last.provider_identity === last.provider_expected_identity);
  add("provider_descendant_when_present", seen.every((s) => s.provider_child_present !== true || s.provider_descendant_of_supervisor !== false));
  add("no_escaped_process", seen.every((s) => (s.escaped_processes || 0) <= 0));
  add("cost_ledger_within_reservation", seen.every((s) => s.cost_reservation_exceeded !== true) && (last.cost_spent_usd === undefined || last.cost_ceiling_usd === undefined || last.cost_spent_usd <= last.cost_ceiling_usd));
  add("protected_main_unchanged", !last.protected_main_baseline_sha || last.protected_main_sha === last.protected_main_baseline_sha);
  add("no_akior_or_m1", seen.every((s) => s.akior_or_m1_access !== true));
  add("no_customer_or_prod", seen.every((s) => s.customer_or_prod_access !== true));
  add("no_merge_push_deploy_send_payment", seen.every((s) => s.merge_push_deploy_send_payment !== true));
  add("single_provider_route_and_executor", seen.every((s) => s.second_provider_route !== true && s.second_executor !== true));
  add("activation_replay_blocked", last.consumed === true);
  add("no_immediate_crash_loop", (last.crash_count || 0) < 3);
  // HOLD condition (not boundary-critical): a missing/unaccounted cost fails CLOSED to HELD, never HEALTHY_CONTINUE.
  add("missing_cost_causes_held", last.missing_cost_held !== false);

  const BOUNDARY_CRITICAL = new Set(["run_id_stable", "immutable_deadline_unchanged", "process_start_identity_stable", "supervisor_alive_when_active", "no_duplicate_supervisor", "provider_identity_matches", "provider_descendant_when_present", "no_escaped_process", "cost_ledger_within_reservation", "protected_main_unchanged", "no_akior_or_m1", "no_customer_or_prod", "no_merge_push_deploy_send_payment", "single_provider_route_and_executor", "activation_replay_blocked", "no_immediate_crash_loop"]);
  const HOLD_CONDITIONS = new Set(["missing_cost_causes_held"]);
  const failed = checks.filter((c) => !c.ok);
  const criticalFail = failed.some((c) => BOUNDARY_CRITICAL.has(c.name));
  const holdCondition = failed.some((c) => HOLD_CONDITIONS.has(c.name));

  let result, reason;
  if (criticalFail) { result = "FAILED"; reason = "boundary-critical: " + failed.filter((c) => BOUNDARY_CRITICAL.has(c.name)).map((c) => c.name).join(","); }
  else if (failedTerminal) { result = "FAILED"; reason = "terminal " + terminalState; }
  else if (successfulTerminal) { result = holdCondition ? "HELD" : "COMPLETED_HEALTHY"; reason = holdCondition ? "successful terminal but missing-cost held" : "run reached successful terminal " + terminalState; }
  else if (controlledTerminal) { result = "HELD"; reason = "controlled terminal " + terminalState; }
  else if (runActiveAtEnd) {
    if (!progressed) { result = "HELD"; reason = "STALLED: RUN_ACTIVE but no progress across the window"; }
    else if (holdCondition) { result = "HELD"; reason = "RUN_ACTIVE but a hold condition is active (missing cost)"; }
    else { result = "HEALTHY_CONTINUE"; reason = "RUN_ACTIVE with progress (hb=" + heartbeatAdvanced + " evidence=" + evidenceAdvanced + " provider=" + providerSeen + ")"; }
  } else { result = "INSUFFICIENT_EVIDENCE"; reason = "run neither RUN_ACTIVE-at-end nor in a readable terminal state"; }

  return {
    schema: WITNESS_SCHEMA, result, reason, polls,
    run_active_at_end: runActiveAtEnd, terminal_state: terminalState || null,
    progressed, heartbeat_advanced: heartbeatAdvanced, evidence_index_advanced: evidenceAdvanced, provider_seen: providerSeen,
    evidence_index_first: ev0, evidence_index_last: ev1,
    checks, failed_checks: failed.map((c) => c.name), read_only: true,
  };
}
