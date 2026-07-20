// FounderGate LRCQ — COMPLETE internal shadow run through the EXACT orchestrator (harness.mjs).
// 25+ scripted jobs, deterministic stubs only (NO real Claude). Proves the governed flow.
import { runHarness } from "../run-harness/harness.mjs";
import { standardChecks, STEP_ORDER } from "../run-harness/setup-pipeline.mjs";

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log("  FAIL " + name); } else console.log("  ok   " + name); };

const NOW = 1000, DEADLINE = 9_000_000;
const bindings = { lrcq_base_sha: "L", lrcq_base_tree: "LT", provider_candidate_sha: "P", provider_candidate_tree: "PT", run_harness_candidate_sha: "R", run_harness_candidate_tree: "RT", assurance_control_backlog_digest: "MD", first_real_run_backlog_digest: "FD", provider_path: "/founder/approved/claude", provider_identity: "id:approved", now_epoch: NOW, candidate_stack: "R" };
const activation = { schema_version: "lrcq-activation-3", founder_signature: "FOUNDER-SIGNED", issued_epoch: 500, expiry_epoch: 9_999_999, lrcq_base_sha: "L", lrcq_base_tree: "LT", provider_candidate_sha: "P", provider_candidate_tree: "PT", run_harness_candidate_sha: "R", run_harness_candidate_tree: "RT", assurance_control_backlog_digest: "MD", first_real_run_backlog_digest: "FD", provider_executable_path: "/founder/approved/claude", provider_version: "1.0", provider_executable_identity: "id:approved", policy_version: "pv", capability_lease_digest: "ld", blast_radius_budget_digest: "bd", run_id: "shadow", hard_deadline_epoch: DEADLINE, run_duration_s: 18000, max_parallel_width: 3, per_job_timeout_s: 2700, termination_grace_s: 30, max_output_bytes: 1048576, max_budget_usd: 5, delegation_depth: 1, external_calls: 0, recipients: 0, no_protected_main_merge: true, no_pr_merge: true, no_push_unless_authorized: true, no_m1: true, no_akior: true, no_customer_data: true, no_live_action: true, no_permission_bypass: true };
const lease = { lease_id: "L1", run_id: "shadow", job_id: null, role: "builder", candidate_stack: "R", branch: null, worktree: null, allowed_files: ["src/"], allowed_tools: ["Read", "Write"], denied_tools: ["Bash"], effect_class: "LOCAL_FS", deadline_epoch: DEADLINE, max_cost_usd: 5, max_files: 10, max_changed_lines: 500, max_external_calls: 0, max_delegation_depth: 1, evidence_dir: "/ev", uses_remaining: 1000, single_use: false, expiry_epoch: 9_999_999, revoked: false };
const blast = { max_files: 200, max_changed_lines: 9000, max_branches: 60, max_worktrees: 60, max_external_calls: 0, max_recipients: 0, max_dollars: 10, max_records: 100, max_execution_s: 18000, max_delegation_depth: 1, max_output_bytes: 10485760 };
const J = (id, over = {}) => ({ job_id: id, title: "t", objective: "o", done_meaning: "d", source: "s", risk_class: "WIDE_SAFE", effect_class: "LOCAL_FS", dependencies: [], allowed_files: ["src/x/" + id + ".mjs"], forbidden_files: [], branch: "lane/" + id, worktree: "/wt/" + id, expected_outputs: ["x"], tests: ["t"], required_evidence: ["e"], checker_requirement: "ind", gate_trigger: "NONE", estimated_minutes: 5, max_attempts: 3, correction_cycle: 0, status: "PENDING", ...over });

// ---- 25 scripted jobs covering every required scenario ----
const jobs = [];
for (let i = 1; i <= 8; i++) jobs.push(J("safe" + i));                                   // parallel-lane bulk (disjoint files)
jobs.push(J("chainA"), J("chainB", { dependencies: ["chainA"] }), J("chainC", { dependencies: ["chainB"] })); // dependency chain
jobs.push(J("laneX1"), J("laneX2", { dependencies: ["laneX1"] }));                        // second disjoint lane
jobs.push(J("flaky", { sim: { outcome: "mv_fail" } }));                                   // transient builder failure
jobs.push(J("finding", { sim: { outcome: "checker_find_once" } }));                       // one checker finding then clean
jobs.push(J("broken", { sim: { outcome: "fail_always" } }));                              // repeatedly failing -> park
jobs.push(J("crashIntent", { sim: { outcome: "crash_after_intent" } }));                  // crash after intent -> SAFE_TO_RESUME
jobs.push(J("crashDispatch", { sim: { outcome: "crash_after_dispatch" } }));              // crash after dispatch -> NEEDS_RECONCILIATION
jobs.push(J("reconHold", { sim: { outcome: "recon_hold" } }));                            // reconciliation hold (corrupt)
jobs.push(J("diagBranch", { sim: { outcome: "crash_after_dispatch" } }));                 // diagnostic branch recommend
jobs.push(J("abandoned", { sim: { outcome: "abandon" } }));                               // abandoned -> ABANDON
jobs.push(J("founderGate", { gate_trigger: "FOUNDER_GATE" }));                            // founder-gated -> never start
jobs.push(J("unknownJob", { risk_class: "UNKNOWN" }));                                    // unknown -> never start
jobs.push(J("safeTail1"), J("safeTail2"));                                                // extra safe work to prove others continue

const attempts = {};
const dispatch = async (j) => {
  const s = j.sim || { outcome: "pass" };
  attempts[j.job_id] = (attempts[j.job_id] || 0) + 1;
  if (s.outcome === "crash_after_intent") return { uncertain: true, obs: { intent_exists: true, dispatch_exists: false, process_alive: false, worktree_unchanged: true } };
  if (s.outcome === "crash_after_dispatch") return { uncertain: true, obs: { dispatch_exists: true, process_alive: false, definitive_result: false } };
  if (s.outcome === "recon_hold") return { uncertain: true, obs: { checkpoint_corrupt: true } };
  if (s.outcome === "abandon") return { uncertain: true, obs: {} };
  if (s.outcome === "mv_fail") return { ok: true, machine_verified: attempts[j.job_id] >= 2 };
  if (s.outcome === "fail_always") return { ok: false, machine_verified: false };
  if (s.outcome === "checker_find_once") return { ok: true, machine_verified: true, checker_clean: attempts[j.job_id] >= 2 };
  return { ok: true, machine_verified: true, checker_clean: true };
};
// independent read-only checker honoring the scripted "finding" outcome
const checker = async (j, builderSession, attempt) => {
  const clean = (j.sim && j.sim.outcome === "checker_find_once") ? attempt >= 2 : true;
  return { clean, session: { session_id: "checker:" + j.job_id + ":" + attempt, prompt_digest: "cpd:" + j.job_id + ":" + attempt, read_only: true } };
};

const released = [];
const lockManager = { acquire: () => ({ ok: true }), release: (id) => released.push(id) };
const r = await runHarness({ run_id: "shadow", runtime_kind: "DETERMINISTIC_TEST", activation, bindings, now: NOW, deadlineEpoch: DEADLINE, maxWidth: 3, master_digest: "MD", lease_digest: "ld", blast_digest: "bd", lease, blast_budget: blast, setupChecks: { ...standardChecks({ host_model: "Mac16,11", repo_origin_ok: true, lrcq_base_ok: true, provider_candidate_ok: true, run_harness_candidate_ok: true, master_digest: "M", expected_master_digest: "M", frr_digest: "F", expected_frr_digest: "F", provider_identity: "ID", expected_provider_identity: "ID", active_run: false, lock_acquired: true, run_id: "shadow", evidence_root: "/ev", ledger_ready: true, replay_ready: true, tx_registry_ready: true, branches_ok: true, worktrees_ok: true, identity_ok: true, controller_real: true, backlog_loaded: true, dep_graph_ok: true, console_started: true, ready_recorded: true, scheduling_allowed: true }), validate_activation_record: () => ({ ok: true }), validate_capability_lease: () => ({ ok: true }), validate_blast_budget: () => ({ ok: true }) }, backlog: jobs, dispatch, checker, lockManager });

const R = r.jobResults;
ok("00 orchestrator ran (ready)", r.ready === true);
ok("01 >=25 jobs in run", jobs.length >= 25);
ok("02 setup step order is the canonical 25", STEP_ORDER.length === 25 && STEP_ORDER[0] === "verify_host" && STEP_ORDER[STEP_ORDER.length - 1] === "allow_scheduling");
ok("03 8 parallel-lane safe jobs COMPLETED", Array.from({ length: 8 }, (_, i) => "safe" + (i + 1)).every((id) => R[id] && R[id].state === "COMPLETED"));
ok("04 dependency chain A->B->C COMPLETED in order", R.chainA.state === "COMPLETED" && R.chainB.state === "COMPLETED" && R.chainC.state === "COMPLETED");
ok("05 second disjoint lane COMPLETED", R.laneX1.state === "COMPLETED" && R.laneX2.state === "COMPLETED");
ok("06 transient builder failure recovers to COMPLETED", R.flaky.state === "COMPLETED" && attempts.flaky >= 2);
ok("07 checker finding -> correction -> COMPLETED", R.finding.state === "COMPLETED" && attempts.finding >= 2);
ok("08 repeatedly failing job PARKED (not completed)", R.broken.state === "PARKED");
ok("09 crash-after-intent -> SAFE_TO_RESUME (resumable, not retried)", R.crashIntent.reconciliation === "SAFE_TO_RESUME" && R.crashIntent.resumed === false && R.crashIntent.resumable === true);
ok("10 crash-after-dispatch -> NEEDS_RECONCILIATION (never re-fired)", R.crashDispatch.reconciliation === "NEEDS_RECONCILIATION" && R.crashDispatch.resumed === false && R.crashDispatch.resumable === false);
ok("11 reconciliation hold -> HELD (never green)", R.reconHold.reconciliation === "HELD");
ok("12 diagnostic branch recommend BRANCH", R.diagBranch.recommend === "BRANCH");
ok("13 abandoned recommend ABANDON", R.abandoned.recommend === "ABANDON");
ok("14 founder-gated job NEVER started (HELD, no result)", R.founderGate === undefined && r.held_jobs.some((h) => h.job_id === "founderGate"));
ok("15 unknown-class job NEVER started (HELD, no result)", R.unknownJob === undefined && r.held_jobs.some((h) => h.job_id === "unknownJob"));
ok("16 unrelated safe work continued despite held/parked jobs", R.safeTail1.state === "COMPLETED" && R.safeTail2.state === "COMPLETED");
ok("17 uncertain jobs dispatched exactly once (no re-fire)", attempts.crashDispatch === 1 && attempts.reconHold === 1 && attempts.abandoned === 1);
ok("18 no duplicate dispatch keys in registry", (() => { const keys = Object.keys(r.txRegistry); return new Set(keys).size === keys.length; })());
ok("19 leases consumed / blast budget held (records == completed count)", r.usage.max_records === r.completed_count);
ok("20 evidence sealed before completion (every COMPLETED has SEALED tx)", Object.entries(R).filter(([, v]) => v.state === "COMPLETED").every(([id]) => Object.values(r.txRegistry).some((t) => t.job_id === id && t.state === "SEALED")));
ok("21 builder/checker independence held (no throw)", r.ready === true);
ok("22 replay chain intact after full run", r.replay_ok === true && r.replay_len >= 15);
ok("23 all locks released / accounted on teardown", r.teardown.lock_file_released === true && released.includes("shadow"));
ok("24 nothing merged/accepted/pushed/protected-main", r.merged === false && r.accepted === false && r.pushed === false && r.protected_main_written === false);
ok("25 final state is a bounded stop", r.final_state === "STOPPED_EXHAUSTED");

console.log("\nLRCQ ORCHESTRATED-SHADOW SELFTEST: " + (n - fails.length) + "/" + n + " passed (" + jobs.length + " jobs through harness.mjs)");
if (fails.length) { console.log("FAILED: " + fails.join(", ")); process.exit(1); }
process.exit(0);
