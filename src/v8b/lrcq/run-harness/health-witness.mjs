// FounderGate LRCQ — read-only launch-health WITNESS (FG-LRCQ-ACT-016). After a run is launched, this
// OBSERVES the existing run for a bounded window (12 min in production; accelerated + deterministic in
// tests) and reports whether the reviewed operational controls are functioning — HEALTHY / HELD / FAILED
// / INSUFFICIENT_EVIDENCE. It NEVER launches, restarts, repairs, invokes the provider, extends the
// deadline, writes run state, or mutates anything. It only reads snapshots + evidence + process state.
export const WITNESS_SCHEMA = "lrcq-health-witness-1";

// opts.snapshot() -> a read-only observation object (injectable so tests drive evolution deterministically):
//   { supervisor: {run_id, supervisor_pid, immutable_hard_deadline_epoch, state, heartbeat_epoch, activation_id},
//     supervisor_alive: bool, duplicate_supervisors: int, consumed: bool (activation replay-blocked),
//     queue_total: int, queue_initial_expected: int, provider_invocations: int, provider_identity: str,
//     provider_expected_identity: str, provider_descendant_of_supervisor: bool, escaped_processes: int,
//     first_worktree_in_authorized_root: bool, evidence_files: int, cost_spent_usd: num,
//     cost_ceiling_usd: num, cost_reservation_exceeded: bool, missing_cost_held: bool,
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

  const checks = []; const add = (n, ok, d) => checks.push({ name: n, ok: !!ok, detail: d || "" });
  const stable = (f) => seen.every((s) => f(s) === f(first));
  const anyTerminalFailClosed = seen.some((s) => s.terminal_state && /HELD|FAILED_CLOSED|STOPPED_/.test(s.terminal_state));

  // 1-4 supervisor
  add("run_id_stable", stable((s) => s.supervisor && s.supervisor.run_id), last.supervisor && last.supervisor.run_id);
  add("immutable_deadline_unchanged", stable((s) => s.supervisor && s.supervisor.immutable_hard_deadline_epoch));
  add("supervisor_alive_or_honest_terminal", last.supervisor_alive === true || anyTerminalFailClosed);
  add("no_duplicate_supervisor", seen.every((s) => (s.duplicate_supervisors || 0) <= 0));
  // 5 queue
  add("initial_queue_population", (first.queue_initial_expected === undefined) || first.queue_total <= first.queue_initial_expected && first.queue_initial_expected > 0);
  // 6-8 provider
  add("provider_invocation_or_failclosed", (last.provider_invocations || 0) >= 1 || anyTerminalFailClosed);
  add("provider_identity_matches", !last.provider_identity || last.provider_identity === last.provider_expected_identity);
  add("provider_descendant_of_supervisor", (last.provider_invocations || 0) === 0 || last.provider_descendant_of_supervisor !== false);
  // 9 worktree
  add("first_worktree_in_authorized_root", (last.provider_invocations || 0) === 0 || last.first_worktree_in_authorized_root !== false);
  // 10-12 boundaries
  add("protected_main_unchanged", !last.protected_main_baseline_sha || last.protected_main_sha === last.protected_main_baseline_sha);
  add("no_akior_or_m1", seen.every((s) => s.akior_or_m1_access !== true));
  add("no_customer_or_prod", seen.every((s) => s.customer_or_prod_access !== true));
  // 13-14 cost
  add("cost_ledger_within_reservation", seen.every((s) => s.cost_reservation_exceeded !== true) && (last.cost_spent_usd === undefined || last.cost_ceiling_usd === undefined || last.cost_spent_usd <= last.cost_ceiling_usd));
  add("missing_cost_causes_held", last.missing_cost_held !== false);
  // 15 evidence durability
  add("evidence_appearing_durably", (last.evidence_files || 0) >= 1 || anyTerminalFailClosed);
  // 16-18 process / route hygiene
  add("no_escaped_process", seen.every((s) => (s.escaped_processes || 0) <= 0));
  add("no_immediate_crash_loop", (last.crash_count || 0) < 3);
  add("single_provider_route_and_executor", seen.every((s) => s.second_provider_route !== true && s.second_executor !== true));
  // 19 no outward action
  add("no_merge_push_deploy_send_payment", seen.every((s) => s.merge_push_deploy_send_payment !== true));
  // 20 anti-replay active
  add("activation_replay_blocked", last.consumed === true);

  const failed = checks.filter((c) => !c.ok);
  // Boundary-critical failures => FAILED (unsafe). Terminal fail-closed with clean boundaries => HELD.
  const boundaryCritical = ["protected_main_unchanged", "no_akior_or_m1", "no_customer_or_prod", "single_provider_route_and_executor", "no_merge_push_deploy_send_payment", "activation_replay_blocked", "no_escaped_process", "no_duplicate_supervisor", "provider_identity_matches", "cost_ledger_within_reservation"];
  const criticalFail = failed.some((c) => boundaryCritical.includes(c.name));
  let result;
  if (criticalFail) result = "FAILED";
  else if (last.terminal_state && /HELD/.test(last.terminal_state)) result = "HELD";
  else if (failed.length === 0) result = "HEALTHY";
  else if (anyTerminalFailClosed && failed.every((c) => !boundaryCritical.includes(c.name))) result = "HELD";
  else result = "INSUFFICIENT_EVIDENCE";

  return { schema: WITNESS_SCHEMA, result, polls, checks, failed_checks: failed.map((c) => c.name), terminal_state: last.terminal_state || null, read_only: true };
}
