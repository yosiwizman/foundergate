// FounderGate LRCQ — read-only launch-health witness proof (FG-LRCQ-ACT-016). Deterministic, accelerated.
import { witnessHealth } from "../run-harness/health-witness.mjs";

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log("  FAIL " + name); } else console.log("  ok   " + name); };
const noSleep = () => Promise.resolve();
const healthy = (o = {}) => ({
  supervisor: { run_id: "REAL-RUN", supervisor_pid: 4242, immutable_hard_deadline_epoch: 19000, state: "RUN_ACTIVE", heartbeat_epoch: 1200, activation_id: "sha256:aid" },
  supervisor_alive: true, duplicate_supervisors: 0, consumed: true,
  queue_total: 25, queue_initial_expected: 25, provider_invocations: 1, provider_identity: "sha256:90608b5c", provider_expected_identity: "sha256:90608b5c",
  provider_descendant_of_supervisor: true, escaped_processes: 0, first_worktree_in_authorized_root: true, evidence_files: 3,
  cost_spent_usd: 0.25, cost_ceiling_usd: 10, cost_reservation_exceeded: false, missing_cost_held: true,
  protected_main_sha: "MAIN0", protected_main_baseline_sha: "MAIN0", akior_or_m1_access: false, customer_or_prod_access: false,
  merge_push_deploy_send_payment: false, crash_count: 0, second_provider_route: false, second_executor: false, terminal_state: null, ...o,
});

// 01 HEALTHY
{ const r = await witnessHealth({ snapshot: () => healthy(), polls: 3, pollMs: 0, sleep: noSleep }); ok("01 healthy run -> HEALTHY", r.result === "HEALTHY" && r.read_only === true && r.failed_checks.length === 0); }
// 02 FAILED: protected-main mutated (boundary breach)
{ const r = await witnessHealth({ snapshot: () => healthy({ protected_main_sha: "MAIN1" }), polls: 3, pollMs: 0, sleep: noSleep }); ok("02 protected-main change -> FAILED", r.result === "FAILED" && r.failed_checks.includes("protected_main_unchanged")); }
// 03 FAILED: activation not replay-blocked
{ const r = await witnessHealth({ snapshot: () => healthy({ consumed: false }), polls: 3, pollMs: 0, sleep: noSleep }); ok("03 no anti-replay -> FAILED", r.result === "FAILED" && r.failed_checks.includes("activation_replay_blocked")); }
// 04 FAILED: duplicate supervisor
{ const r = await witnessHealth({ snapshot: () => healthy({ duplicate_supervisors: 1 }), polls: 3, pollMs: 0, sleep: noSleep }); ok("04 duplicate supervisor -> FAILED", r.result === "FAILED" && r.failed_checks.includes("no_duplicate_supervisor")); }
// 05 FAILED: provider identity mismatch
{ const r = await witnessHealth({ snapshot: () => healthy({ provider_identity: "sha256:WRONG" }), polls: 3, pollMs: 0, sleep: noSleep }); ok("05 provider identity mismatch -> FAILED", r.result === "FAILED" && r.failed_checks.includes("provider_identity_matches")); }
// 06 FAILED: cost exceeded reservation
{ const r = await witnessHealth({ snapshot: () => healthy({ cost_reservation_exceeded: true }), polls: 3, pollMs: 0, sleep: noSleep }); ok("06 cost overrun -> FAILED", r.result === "FAILED" && r.failed_checks.includes("cost_ledger_within_reservation")); }
// 07 FAILED: escaped process
{ const r = await witnessHealth({ snapshot: () => healthy({ escaped_processes: 2 }), polls: 3, pollMs: 0, sleep: noSleep }); ok("07 escaped process -> FAILED", r.result === "FAILED" && r.failed_checks.includes("no_escaped_process")); }
// 08 FAILED: second executor / provider route
{ const r = await witnessHealth({ snapshot: () => healthy({ second_executor: true }), polls: 3, pollMs: 0, sleep: noSleep }); ok("08 second executor -> FAILED", r.result === "FAILED" && r.failed_checks.includes("single_provider_route_and_executor")); }
// 09 FAILED: outward action (merge/push/send/payment)
{ const r = await witnessHealth({ snapshot: () => healthy({ merge_push_deploy_send_payment: true }), polls: 3, pollMs: 0, sleep: noSleep }); ok("09 outward action -> FAILED", r.result === "FAILED"); }
// 10 HELD: honest terminal HELD with clean boundaries (fail-closed, not unsafe)
{ const r = await witnessHealth({ snapshot: () => healthy({ terminal_state: "HELD_TEARDOWN_DEFECT", provider_invocations: 1 }), polls: 3, pollMs: 0, sleep: noSleep }); ok("10 terminal HELD + clean boundaries -> HELD", r.result === "HELD"); }
// 11 INSUFFICIENT: no provider invocation yet, no terminal state, non-critical only
{ const r = await witnessHealth({ snapshot: () => healthy({ provider_invocations: 0, evidence_files: 0, terminal_state: null }), polls: 3, pollMs: 0, sleep: noSleep });
  ok("11 no invocation + no terminal -> INSUFFICIENT_EVIDENCE", r.result === "INSUFFICIENT_EVIDENCE"); }
// 12 run_id must be STABLE across polls (a changing run_id is a witness failure)
{ let i = 0; const r = await witnessHealth({ snapshot: () => healthy({ supervisor: { ...healthy().supervisor, run_id: i++ === 0 ? "REAL-RUN" : "OTHER" } }), polls: 3, pollMs: 0, sleep: noSleep });
  ok("12 unstable run_id detected", r.failed_checks.includes("run_id_stable")); }
// 13 immutable deadline must be STABLE across polls
{ let i = 0; const r = await witnessHealth({ snapshot: () => healthy({ supervisor: { ...healthy().supervisor, immutable_hard_deadline_epoch: i++ === 0 ? 19000 : 99999 } }), polls: 3, pollMs: 0, sleep: noSleep });
  ok("13 deadline extension detected", r.failed_checks.includes("immutable_deadline_unchanged")); }
// 14 no source -> INSUFFICIENT (never assumes health)
{ const r = await witnessHealth({}); ok("14 no snapshot source -> INSUFFICIENT_EVIDENCE", r.result === "INSUFFICIENT_EVIDENCE"); }
// 15 missing-cost must HELD not silently continue
{ const r = await witnessHealth({ snapshot: () => healthy({ missing_cost_held: false }), polls: 3, pollMs: 0, sleep: noSleep }); ok("15 silent missing-cost continuation flagged", r.failed_checks.includes("missing_cost_causes_held")); }

console.log("\nLRCQ HEALTH-WITNESS SELFTEST: " + (n - fails.length) + "/" + n + " passed");
if (fails.length) { console.log("FAILED: " + fails.join(", ")); process.exit(1); }
process.exit(0);
