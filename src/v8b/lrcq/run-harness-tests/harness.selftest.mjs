// FounderGate LRCQ — orchestrator (harness.mjs) test matrix. DETERMINISTIC STUBS ONLY.
// Never invokes real Claude; the provider dispatch seam is an injected pure function.
import { runHarness } from "../run-harness/harness.mjs";
import { standardChecks } from "../run-harness/setup-pipeline.mjs";
import { validateActivationV3 } from "../assurance/assurance-core.mjs";

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log("  FAIL " + name); } else console.log("  ok   " + name); };

// ---- canonical fixtures ----
const NOW = 1000, DEADLINE = 9_000_000;
const bindings = {
  lrcq_base_sha: "L", lrcq_base_tree: "LT", provider_candidate_sha: "P", provider_candidate_tree: "PT",
  run_harness_candidate_sha: "R", run_harness_candidate_tree: "RT",
  assurance_control_backlog_digest: "MD", first_real_run_backlog_digest: "FD",
  provider_path: "/founder/approved/claude", provider_identity: "id:approved", now_epoch: NOW, candidate_stack: "R",
};
const activation = () => ({
  schema_version: "lrcq-activation-3", founder_signature: "FOUNDER-SIGNED", issued_epoch: 500, expiry_epoch: 9_999_999,
  lrcq_base_sha: "L", lrcq_base_tree: "LT", provider_candidate_sha: "P", provider_candidate_tree: "PT",
  run_harness_candidate_sha: "R", run_harness_candidate_tree: "RT",
  assurance_control_backlog_digest: "MD", first_real_run_backlog_digest: "FD",
  provider_executable_path: "/founder/approved/claude", provider_version: "1.0", provider_executable_identity: "id:approved",
  policy_version: "pv", capability_lease_digest: "ld", blast_radius_budget_digest: "bd",
  run_id: "run-X", hard_deadline_epoch: DEADLINE, run_duration_s: 18000, max_parallel_width: 2, per_job_timeout_s: 2700,
  termination_grace_s: 30, max_output_bytes: 1048576, max_budget_usd: 5, delegation_depth: 1, external_calls: 0, recipients: 0,
  no_protected_main_merge: true, no_pr_merge: true, no_push_unless_authorized: true, no_m1: true, no_akior: true,
  no_customer_data: true, no_live_action: true, no_permission_bypass: true,
});
const lease = () => ({
  lease_id: "lease-1", run_id: "run-X", job_id: null, role: "builder", candidate_stack: "R", branch: null, worktree: null,
  allowed_files: ["src/x/"], allowed_tools: ["Read", "Write"], denied_tools: ["Bash"], effect_class: "LOCAL_FS",
  deadline_epoch: DEADLINE, max_cost_usd: 5, max_files: 10, max_changed_lines: 500, max_external_calls: 0,
  max_delegation_depth: 1, evidence_dir: "/ev", uses_remaining: 100, single_use: false, expiry_epoch: 9_999_999, revoked: false,
});
const blast = () => ({ max_files: 50, max_changed_lines: 2000, max_branches: 30, max_worktrees: 30, max_external_calls: 0, max_recipients: 0, max_dollars: 10, max_records: 100, max_execution_s: 18000, max_delegation_depth: 1, max_output_bytes: 10485760 });
const job = (id, over = {}) => ({ job_id: id, title: "t", objective: "o", done_meaning: "d", source: "s", risk_class: "WIDE_SAFE", effect_class: "LOCAL_FS", dependencies: [], allowed_files: ["src/x/" + id + ".mjs"], forbidden_files: [], branch: "lane/" + id, worktree: "/wt/" + id, expected_outputs: ["x"], tests: ["t"], required_evidence: ["e"], checker_requirement: "ind", gate_trigger: "NONE", estimated_minutes: 5, max_attempts: 3, correction_cycle: 0, status: "PENDING", ...over });
const setupEnv = () => ({ host_model: "Mac16,11", repo_origin_ok: true, lrcq_base_ok: true, provider_candidate_ok: true, run_harness_candidate_ok: true, master_digest: "M", expected_master_digest: "M", frr_digest: "F", expected_frr_digest: "F", provider_identity: "ID", expected_provider_identity: "ID", active_run: false, lock_acquired: true, run_id: "run-X", evidence_root: "/ev", ledger_ready: true, replay_ready: true, tx_registry_ready: true, branches_ok: true, worktrees_ok: true, identity_ok: true, controller_real: true, backlog_loaded: true, dep_graph_ok: true, console_started: true, ready_recorded: true, scheduling_allowed: true });
const setupChecks = () => { const e = setupEnv(); return { ...standardChecks(e), validate_activation_record: () => ({ ok: true }), validate_capability_lease: () => ({ ok: true }), validate_blast_budget: () => ({ ok: true }) }; };

// deterministic dispatch stub keyed by job.sim
const stub = async (j) => {
  const s = j.sim || { outcome: "pass" };
  if (s.outcome === "crash_after_dispatch") return { uncertain: true, obs: { dispatch_exists: true, process_alive: false, definitive_result: false } };
  if (s.outcome === "mv_fail") return { ok: true, machine_verified: j.__attempt >= 2 };
  if (s.outcome === "fail_always") return { ok: false, machine_verified: false };
  return { ok: true, machine_verified: true, checker_clean: s.checker_clean !== false };
};

const base = (over = {}) => ({
  run_id: "run-X", activation: activation(), bindings, now: NOW, deadlineEpoch: DEADLINE, maxWidth: 2,
  master_digest: "MD", lease_digest: "ld", blast_digest: "bd", lease: lease(), blast_budget: blast(),
  setupChecks: setupChecks(), setupCtx: {}, backlog: [job("j1")], dispatch: stub, ...over,
});

// ============ HAPPY PATH ============
{ const r = await runHarness(base()); ok("00 happy path ready + j1 COMPLETED", r.ready && r.jobResults.j1.state === "COMPLETED" && r.merged === false && r.accepted === false); }

// ============ ACTIVATION REFUSALS (no dispatch) ============
{ const r = await runHarness(base({ activation: null })); ok("01 missing activation refused", !r.ready && r.refused.stage === "load_activation" && !r.dispatched); }
{ const a = activation(); a.expiry_epoch = 900; const r = await runHarness(base({ activation: a })); ok("02 stale (expired) activation refused", !r.ready && r.refused.stage === "validate_activation"); }
{ const a = activation(); a.run_harness_candidate_sha = "WRONG"; const r = await runHarness(base({ activation: a })); ok("03 wrong candidate SHA refused", !r.ready && r.refused.reasons.some((x) => /run_harness_candidate_sha differs/.test(x))); }
{ const a = activation(); a.run_harness_candidate_tree = "WRONG"; const r = await runHarness(base({ activation: a })); ok("04 wrong candidate tree refused", !r.ready && r.refused.reasons.some((x) => /tree differs/.test(x))); }
{ const a = activation(); a.assurance_control_backlog_digest = "WRONG"; const r = await runHarness(base({ activation: a })); ok("05 wrong backlog digest refused", !r.ready && r.refused.reasons.some((x) => /backlog_digest differs/.test(x))); }
{ const a = activation(); a.provider_executable_identity = "WRONG"; const r = await runHarness(base({ activation: a })); ok("06 wrong provider identity refused", !r.ready && r.refused.reasons.some((x) => /provider_executable_identity differs/.test(x))); }
{ const a = activation(); a.max_parallel_width = 5; const r = await runHarness(base({ activation: a })); ok("07 width>3 refused", !r.ready && r.refused.reasons.some((x) => /max_parallel_width/.test(x))); }
{ const a = activation(); a.external_calls = 2; const r = await runHarness(base({ activation: a })); ok("08 external_calls!=0 refused", !r.ready); }
{ const a = activation(); a.no_protected_main_merge = false; const r = await runHarness(base({ activation: a })); ok("09 no_protected_main_merge false refused", !r.ready); }

// ============ SETUP PIPELINE ============
{ const c = setupChecks(); c.verify_host = () => ({ ok: false, actual: "wrong" }); const r = await runHarness(base({ setupChecks: c })); ok("10 setup failure blocks run (no dispatch)", !r.ready && r.refused.stage === "setup_pipeline" && !r.dispatched); }
{ const c = setupChecks(); delete c.acquire_run_lock; const r = await runHarness(base({ setupChecks: c })); ok("11 missing setup verifier fails closed", !r.ready && r.refused.stage === "setup_pipeline"); }

// ============ LEASE ============
{ const r = await runHarness(base({ lease: null })); ok("12 absent lease refused", !r.ready && r.refused.stage === "validate_capability_lease"); }
{ const l = lease(); l.revoked = true; const r = await runHarness(base({ lease: l })); ok("13 revoked lease refused", !r.ready && r.refused.reasons.includes("lease revoked")); }
{ const l = lease(); l.expiry_epoch = 500; const r = await runHarness(base({ lease: l })); ok("14 expired lease refused", !r.ready && r.refused.reasons.includes("lease expired")); }
{ const l = lease(); l.single_use = true; l.uses_remaining = 0; const r = await runHarness(base({ lease: l })); ok("15 reused single-use lease refused", !r.ready && r.refused.reasons.includes("single-use lease already consumed")); }
{ const l = lease(); l.run_id = "OTHER"; const r = await runHarness(base({ lease: l })); ok("16 wrong-run lease refused", !r.ready && r.refused.reasons.includes("wrong run")); }

// ============ BLAST ============
{ const r = await runHarness(base({ blast_budget: null })); ok("17 absent blast budget refused", !r.ready && r.refused.stage === "validate_blast_budget"); }
{ const b = blast(); delete b.max_files; const r = await runHarness(base({ blast_budget: b })); ok("18 missing blast dim refused", !r.ready && r.refused.reasons.includes("missing max_files")); }
{ const b = blast(); b.max_records = 1; const jobs = [job("a"), job("b"), job("c")]; const r = await runHarness(base({ backlog: jobs, blast_budget: b })); const parked = Object.values(r.jobResults).filter((x) => x.state === "PARKED"); ok("19 budget N allows EXACTLY N completions (no N+1) -> excess parked (blast)", r.completed_count === 1 && parked.length === 2 && /blast/.test(parked[0].reason || "")); }
{ const b = blast(); b.max_records = 2; const jobs = [job("a"), job("b"), job("c")]; const r = await runHarness(base({ backlog: jobs, blast_budget: b })); ok("19b budget 2 -> exactly 2 completed, 1 parked (off-by-one fixed)", r.completed_count === 2 && Object.values(r.jobResults).filter((x) => x.state === "PARKED").length === 1); }

// ============ BRANCH / WORKTREE ============
{ const r = await runHarness(base({ backlog: [job("m", { branch: "main" })] })); ok("20 protected-main branch job parked (never dispatched to)", r.jobResults.m.state === "PARKED"); }
{ const r = await runHarness(base({ backlog: [job("w", { worktree: "" })] })); ok("21 empty worktree job parked", r.jobResults.w.state === "PARKED"); }

// ============ DUPLICATE IDEMPOTENCY ============
{ const reg = { "k:run-X:dup:1": { state: "DISPATCHED", job_id: "dup" } }; const r = await runHarness(base({ backlog: [job("dup")], txByKey: reg })); ok("22 duplicate idempotency key -> dispatch refused (parked)", r.jobResults.dup.state === "PARKED" && /DUPLICATE|duplicate/.test(r.jobResults.dup.reason || "")); }

// ============ RECONCILIATION / CRASH ============
{ const r = await runHarness(base({ backlog: [job("c", { sim: { outcome: "crash_after_dispatch" } })] })); ok("23 crash after dispatch -> HELD_RECONCILE NEEDS_RECONCILIATION, not re-fired", r.jobResults.c.state === "HELD_RECONCILE" && r.jobResults.c.reconciliation === "NEEDS_RECONCILIATION" && r.jobResults.c.resumed === false); }
{ const r = await runHarness(base({ backlog: [job("c", { sim: { outcome: "crash_after_dispatch" } })] })); ok("24 uncertain dispatch recommends diagnostic BRANCH", r.jobResults.c.recommend === "BRANCH"); }

// ============ BUILDER/CHECKER SEPARATION ============
{ const r = await runHarness(base({ backlog: [job("mv", { sim: { outcome: "mv_fail" } })], dispatch: async (j) => { j.__attempt = (j.__attempt || 0) + 1; return stub(j); } })); ok("25 builder exit-0 w/o machine verification -> correction then COMPLETED", r.jobResults.mv.state === "COMPLETED"); }
{ const r = await runHarness(base({ backlog: [job("b", { sim: { outcome: "fail_always" }, max_attempts: 3 })] })); ok("26 repeated machine-verif failure PARKS after 3", r.jobResults.b.state === "PARKED"); }
{ let threw = false; try { await runHarness(base({ backlog: [job("ck")], checker: async () => ({ clean: true, session: { session_id: "builder:run-X:ck", prompt_digest: "bpd:ck", read_only: true } }) })); } catch (e) { threw = /independent|builder/.test(e.message); } ok("27 checker sharing builder session/prompt rejected", threw); }
{ let threw = false; try { await runHarness(base({ backlog: [job("ck2")], checker: async () => ({ clean: true, session: { session_id: "cx", prompt_digest: "cpx", read_only: false } }) })); } catch (e) { threw = /read-only/.test(e.message); } ok("28 non-read-only checker rejected", threw); }
{ let attempt = 0; const r = await runHarness(base({ backlog: [job("cf")], checker: async (j, bs, a) => { attempt = a; return { clean: a >= 2, session: { session_id: "cx" + a, prompt_digest: "cpx" + a, read_only: true } }; } })); ok("29 checker finding -> correction -> CLEAN completes", r.jobResults.cf.state === "COMPLETED" && attempt >= 2); }
{ const r = await runHarness(base({ backlog: [job("cf2")], checker: async (j, bs, a) => ({ clean: false, session: { session_id: "cx" + a, prompt_digest: "cpx" + a, read_only: true } }) })); ok("30 persistent checker findings PARK after 3", r.jobResults.cf2.state === "PARKED"); }

// ============ GATE / UNKNOWN NEVER START ============
{ const r = await runHarness(base({ backlog: [job("g", { gate_trigger: "FOUNDER_GATE" })] })); ok("31 founder-gated job never started (HELD)", r.jobResults.g === undefined && r.held_jobs.some((h) => h.job_id === "g")); }
{ const r = await runHarness(base({ backlog: [job("u", { risk_class: "UNKNOWN" })] })); ok("32 unknown-class job never started (HELD)", r.jobResults.u === undefined && r.held_jobs.some((h) => h.job_id === "u")); }
{ const r = await runHarness(base({ backlog: [job("nw", { effect_class: "NETWORK" })] })); ok("33 network-effect job never started (HELD)", r.held_jobs.some((h) => h.job_id === "nw")); }

// ============ PAUSE / STOP / DEADLINE ============
{ const r = await runHarness(base({ backlog: [job("p1"), job("p2")], control: { pause: true } })); ok("34 pause before dispatch -> PAUSED, nothing dispatched", r.final_state === "PAUSED" && !r.dispatched); }
{ const r = await runHarness(base({ backlog: [job("s1"), job("s2")], control: { stop: true } })); ok("35 stop -> STOPPED_BY_STOP, nothing dispatched", r.final_state === "STOPPED_BY_STOP"); }
{ let t = NOW; const r = await runHarness(base({ backlog: [job("d1"), job("d2"), job("d3")], clock: (c) => { c.now = DEADLINE + 1; } })); ok("36 hard deadline -> STOPPED_DEADLINE", r.final_state === "STOPPED_DEADLINE"); }

// ============ QUEUE EXHAUSTION + TEARDOWN ============
{ const r = await runHarness(base({ backlog: [job("e1"), job("e2")] })); ok("37 queue exhaustion -> STOPPED_EXHAUSTED, all completed", r.final_state === "STOPPED_EXHAUSTED" && r.completed_count === 2); }
{ const released = []; const lm = { acquire: () => ({ ok: true }), release: (id) => released.push(id) }; const r = await runHarness(base({ lockManager: lm })); ok("38 lock released on teardown", r.teardown.lock_file_released === true && released.includes("run-X")); }
{ const lm = { acquire: () => ({ ok: false, reason: "live run present" }), release: () => {} }; const r = await runHarness(base({ lockManager: lm })); ok("39 active run on restart -> lock refused, no dispatch", !r.ready && r.refused.stage === "acquire_run_lock" && !r.dispatched); }

// ============ NO DUPLICATE DISPATCH AFTER RESTART ============
{ const reg = {}; await runHarness(base({ backlog: [job("r1")], txByKey: reg })); const before = Object.keys(reg).length; const r2 = await runHarness(base({ backlog: [job("r1")], txByKey: reg })); ok("40 restart with same registry does not double-dispatch j r1", r2.jobResults.r1.state === "PARKED" && Object.keys(reg).length === before); }

// ============ REPLAY INTEGRITY ============
{ const r = await runHarness(base({ backlog: [job("a"), job("b")] })); ok("41 replay chain intact + populated", r.replay_ok === true && r.replay_len >= 2); }

// ============ INVARIANTS ============
{ const r = await runHarness(base()); ok("42 never merged/accepted/pushed/protected-main", r.merged === false && r.accepted === false && r.pushed === false && r.protected_main_written === false); }

console.log("\nLRCQ HARNESS SELFTEST: " + (n - fails.length) + "/" + n + " passed");
if (fails.length) { console.log("FAILED: " + fails.join(", ")); process.exit(1); }
process.exit(0);
