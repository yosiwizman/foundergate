// FounderGate LRCQ — activation-path correction (FG-LRCQ-ACT-001..004).
// Per-job single-use builder leases, real checker activation + lease enforcement. Deterministic; no Claude.
import { runHarness, RUNTIME_KIND, mintBuilderLease } from "../run-harness/harness.mjs";
import { realIndependentCheckerRoute, mintCheckerLease } from "../run-harness/real-seams.mjs";
import { validateLease } from "../assurance/assurance-core.mjs";
import { standardChecks } from "../run-harness/setup-pipeline.mjs";

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log("  FAIL " + name); } else console.log("  ok   " + name); };

const NOW = 1000, DEADLINE = 9_000_000;
const bindings = { lrcq_base_sha: "L", lrcq_base_tree: "LT", provider_candidate_sha: "P", provider_candidate_tree: "PT", run_harness_candidate_sha: "R", run_harness_candidate_tree: "RT", assurance_control_backlog_digest: "MD", first_real_run_backlog_digest: "FD", provider_path: "/a", provider_identity: "id", now_epoch: NOW, candidate_stack: "R" };
const activation = () => ({ schema_version: "lrcq-activation-3", founder_signature: "S", issued_epoch: 500, expiry_epoch: 9_999_999, lrcq_base_sha: "L", lrcq_base_tree: "LT", provider_candidate_sha: "P", provider_candidate_tree: "PT", run_harness_candidate_sha: "R", run_harness_candidate_tree: "RT", assurance_control_backlog_digest: "MD", first_real_run_backlog_digest: "FD", provider_executable_path: "/a", provider_version: "1", provider_executable_identity: "id", policy_version: "pv", capability_lease_digest: "ld", blast_radius_budget_digest: "bd", run_id: "run-X", hard_deadline_epoch: DEADLINE, run_duration_s: 18000, max_parallel_width: 2, per_job_timeout_s: 2700, termination_grace_s: 30, max_output_bytes: 1048576, max_budget_usd: 5, delegation_depth: 1, external_calls: 0, recipients: 0, no_protected_main_merge: true, no_pr_merge: true, no_push_unless_authorized: true, no_m1: true, no_akior: true, no_customer_data: true, no_live_action: true, no_permission_bypass: true });
const template = () => ({ lease_id: "tpl", run_id: "run-X", job_id: null, role: "builder", candidate_stack: "R", branch: null, worktree: null, allowed_files: ["src/"], allowed_tools: ["Read"], denied_tools: ["Bash"], effect_class: "LOCAL_FS", deadline_epoch: DEADLINE, max_cost_usd: 5, max_files: 10, max_changed_lines: 500, max_external_calls: 0, max_delegation_depth: 1, evidence_dir: "/ev", uses_remaining: 1, single_use: true, expiry_epoch: 9_999_999, revoked: false });
const blast = () => ({ max_files: 200, max_changed_lines: 9000, max_branches: 60, max_worktrees: 60, max_external_calls: 0, max_recipients: 0, max_dollars: 10, max_records: 100, max_execution_s: 18000, max_delegation_depth: 1, max_output_bytes: 10485760 });
const job = (id, over = {}) => ({ job_id: id, title: "t", objective: "o", done_meaning: "d", source: "s", risk_class: "WIDE_SAFE", effect_class: "LOCAL_FS", dependencies: [], allowed_files: ["src/x/" + id + ".mjs"], forbidden_files: [], branch: "lane/" + id, worktree: "/wt/" + id, expected_outputs: ["x"], tests: ["t"], required_evidence: ["e"], checker_requirement: "ind", gate_trigger: "NONE", estimated_minutes: 5, max_attempts: 3, correction_cycle: 0, status: "PENDING", ...over });
const cfg = { run_id: "run-X", lease: template(), bindings, deadlineEpoch: DEADLINE, evidenceDir: "/ev" };

// ---- FG-LRCQ-ACT-001: per-job/per-attempt single-use builder leases ----
{ const l = mintBuilderLease(cfg, job("j1"), 1);
  ok("01 minted builder lease is single_use + uses_remaining 1", l.single_use === true && l.uses_remaining === 1);
  ok("02 minted lease bound to job/attempt/branch/worktree/role", l.job_id === "j1" && l.attempt === 1 && l.branch === "lane/j1" && l.worktree === "/wt/j1" && l.role === "builder");
  ok("03 unique lease_id per job", mintBuilderLease(cfg, job("j1"), 1).lease_id !== mintBuilderLease(cfg, job("j2"), 1).lease_id);
  ok("04 unique lease_id per attempt", mintBuilderLease(cfg, job("j1"), 1).lease_id !== mintBuilderLease(cfg, job("j1"), 2).lease_id);
  ok("05 minting from a permissive template still yields single-use", mintBuilderLease({ ...cfg, lease: { ...template(), single_use: false, uses_remaining: 1000 } }, job("j1"), 1).single_use === true); }

// ---- durable consumption + no-reuse through a full REAL run ----
const seams = (over = {}) => { const tx = []; return { txlog: tx, setupChecks: { ...standardChecks({ host_model: "Mac16,11", repo_origin_ok: true, lrcq_base_ok: true, provider_candidate_ok: true, run_harness_candidate_ok: true, master_digest: "M", expected_master_digest: "M", frr_digest: "F", expected_frr_digest: "F", provider_identity: "ID", expected_provider_identity: "ID", active_run: false, lock_acquired: true, run_id: "run-X", evidence_root: "/ev", ledger_ready: true, replay_ready: true, tx_registry_ready: true, branches_ok: true, worktrees_ok: true, identity_ok: true, controller_real: true, backlog_loaded: true, dep_graph_ok: true, console_started: true, ready_recorded: true, scheduling_allowed: true }), validate_activation_record: () => ({ ok: true }), validate_capability_lease: () => ({ ok: true }), validate_blast_budget: () => ({ ok: true }) }, lockManager: { acquire: () => ({ ok: true }), release: () => {} }, liveClock: () => NOW, controlReader: () => ({ pause: false, stop: false }), evidenceWriter: { append() {}, index() {} }, recoveryWriter: { write() {}, nextSafeAction() {} }, transactionWriter: { record: (key, state, extra) => tx.push({ key, state, extra }) }, replayWriter: { append() {} }, machineVerifier: async () => ({ pass: true }), checker: async (j, bs, a, gc) => ({ result: gc && gc.signed_activation && Object.keys(gc.signed_activation).length ? "CLEAN" : "INSUFFICIENT_EVIDENCE", session: { session_id: "c:" + j.job_id + ":" + a, prompt_digest: "cp:" + j.job_id + ":" + a, read_only: true } }), dispatch: async () => ({ ok: true }), teardownVerifier: async () => ({ torn_down: true }), ...over }; };
const base = (over = {}) => ({ run_id: "run-X", runtime_kind: RUNTIME_KIND.REAL, activation: activation(), bindings, now: NOW, deadlineEpoch: DEADLINE, maxWidth: 2, master_digest: "MD", lease_digest: "ld", blast_digest: "bd", lease: template(), blast_budget: blast(), backlog: [job("j1")], ...seams(), ...over });

{ const s = seams(); const r = await runHarness(base({ ...s, backlog: [job("j1")] }));
  const consumed = s.txlog.filter((t) => t.state === "CONSUMED" && t.key.startsWith("lease:"));
  ok("06 builder lease durably CONSUMED before dispatch (record has pre/post uses + dispatch tx)", consumed.length === 1 && consumed[0].extra.pre_uses_remaining === 1 && consumed[0].extra.post_uses_remaining === 0 && !!consumed[0].extra.dispatch_transaction_id && r.jobResults.j1.state === "COMPLETED"); }
{ const s = seams(); const r = await runHarness(base({ ...s, backlog: [job("a"), job("b"), job("c")] }));
  const minted = s.txlog.filter((t) => t.state === "MINTED");
  ok("07 each job gets a uniquely-identified minted lease", new Set(minted.map((m) => m.extra.lease_id)).size === minted.length && minted.length === 3); }

// ---- uncertain dispatch: no new lease / no retry until reconciliation ----
{ const s = seams(); const r = await runHarness(base({ ...s, backlog: [job("u")], dispatch: async () => ({ uncertain: true, obs: { dispatch_exists: true, process_alive: false, definitive_result: false } }) }));
  const minted = s.txlog.filter((t) => t.state === "MINTED");
  ok("08 uncertain dispatch -> exactly one lease minted (no retry/mint)", minted.length === 1 && r.jobResults.u.state === "HELD_RECONCILE" && r.jobResults.u.resumed === false); }

// ---- lease binding refusals ----
ok("09 wrong-job lease refused", validateLease(mintBuilderLease(cfg, job("j1"), 1), { run_id: "run-X", job_id: "OTHER", role: "builder", branch: "lane/j1", worktree: "/wt/j1" }).valid === false);
ok("10 wrong-branch lease refused", validateLease(mintBuilderLease(cfg, job("j1"), 1), { run_id: "run-X", job_id: "j1", role: "builder", branch: "OTHER", worktree: "/wt/j1" }).valid === false);
ok("11 wrong-worktree lease refused", validateLease(mintBuilderLease(cfg, job("j1"), 1), { run_id: "run-X", job_id: "j1", role: "builder", branch: "lane/j1", worktree: "/OTHER" }).valid === false);

// ---- FG-LRCQ-ACT-002: checker receives signed activation explicitly ----
{ const s = seams({ checker: async (j, bs, a, gc) => ({ result: (gc && gc.signed_activation && gc.signed_activation.founder_signature === "S" && gc.builder_transaction_id) ? "CLEAN" : "INSUFFICIENT_EVIDENCE", session: { session_id: "cx:" + a, prompt_digest: "cpx:" + a, read_only: true } }) });
  const r = await runHarness(base({ ...s, backlog: [job("ck")] }));
  ok("12 checker receives the exact signed activation + builder tx id via governed context", r.jobResults.ck.state === "COMPLETED"); }
{ const s = seams(); const r = await runHarness(base({ ...s, activation: {}, backlog: [job("na")] }));
  ok("13 empty activation refuses at validate_activation (never reaches checker as {})", r.ready === false && r.refused.stage === "validate_activation"); }

// ---- FG-LRCQ-ACT-003: checker lease enforcement (mintCheckerLease + route) ----
{ const gc = { signed_activation: activation(), bindings, job_id: "cl", attempt: 1, branch: "lane/cl", worktree: "/wt/cl", evidence_dir: "/ev", builder_session: { session_id: "b" }, builder_prompt_digest: "bp" };
  const cl = mintCheckerLease(gc, { session_id: "cs", prompt_digest: "cp" });
  ok("14 checker lease is read-only + single-use + distinct role", cl.read_only === true && cl.single_use === true && cl.uses_remaining === 1 && cl.role === "checker" && cl.denied_tools.includes("Write") && cl.denied_tools.includes("Edit"));
  ok("15 checker lease is not the builder lease", cl.lease_id !== mintBuilderLease(cfg, job("cl"), 1).lease_id);
  let leaseSeen = null; const route = realIndependentCheckerRoute({ recordLease: (rec) => { leaseSeen = rec; }, dispatchCheckerSession: async (j, lease) => ({ verdict: lease.uses_remaining === 0 ? "CLEAN" : "FINDINGS" }) });
  const res = await route(job("cl"), { session_id: "b", prompt_digest: "bp" }, 1, gc);
  ok("16 checker lease consumed before checker spawn (durably recorded)", res.result === "CLEAN" && leaseSeen && leaseSeen.consumed === true && leaseSeen.role === "checker");
  const consumedSet = new Set(); const route2 = realIndependentCheckerRoute({ consumed: consumedSet, dispatchCheckerSession: async () => ({ verdict: "CLEAN" }) });
  await route2(job("cl"), { session_id: "b", prompt_digest: "bp" }, 1, gc);
  ok("17 reused checker lease refused", (await route2(job("cl"), { session_id: "b", prompt_digest: "bp" }, 1, gc)).result === "INSUFFICIENT_EVIDENCE");
  const badSession = await realIndependentCheckerRoute({ dispatchCheckerSession: async () => ({ verdict: "CLEAN" }) })(job("cl"), { session_id: "checker:cl:1:s", prompt_digest: "bp" }, 1, { ...gc, builder_transaction_id: "s" });
  ok("18 wrong/shared checker session refused", badSession.result === "INSUFFICIENT_EVIDENCE"); }

// ---- mutation guards: an ignored checker lease / empty activation must fail ----
{ const gc = { signed_activation: activation(), bindings, job_id: "m", attempt: 1, branch: "lane/m", worktree: "/wt/m", evidence_dir: "/ev", builder_session: { session_id: "b" }, builder_prompt_digest: "bp" };
  // a dispatch that ignores the checker lease read-only would produce FINDINGS in test 16's assertion form
  const routeIgnore = realIndependentCheckerRoute({ dispatchCheckerSession: async (j, lease) => ({ verdict: lease && lease.read_only ? "CLEAN" : "CLEAN" }) }); // ignores lease -> still validated by route
  ok("19 route validates+consumes the checker lease regardless of callback (lease enforced by route)", (await routeIgnore(job("m"), { session_id: "b", prompt_digest: "bp" }, 1, gc)).checker_lease_id !== undefined);
  ok("20 empty checker activation -> INSUFFICIENT_EVIDENCE", (await realIndependentCheckerRoute({ dispatchCheckerSession: async () => ({ verdict: "CLEAN" }) })(job("m"), { session_id: "b", prompt_digest: "bp" }, 1, { job_id: "m", attempt: 1 })).result === "INSUFFICIENT_EVIDENCE"); }

// ---- FG-LRCQ-ACT-006/007/008: role prompts, teardown enforcement, truthful outcome ----
{ const { builderPrompt, checkerPrompt } = await import("../provider/real-provider.mjs");
  const bp = builderPrompt(job("j")); const cp = checkerPrompt(job("j"));
  ok("21 builder and checker prompts differ", bp !== cp);
  ok("22 checker prompt is READ-ONLY + requires a structured verdict + forbids edits", /READ-ONLY/.test(cp) && /CLEAN \| FINDINGS \| INSUFFICIENT_EVIDENCE/.test(cp) && /may NOT edit/.test(cp) && /Do NOT implement/.test(cp));
  ok("23 builder prompt carries objective + allowed files (bounded)", /Objective:/.test(bp) && /Allowed files/.test(bp)); }
// teardown defect: tree_gone false -> HELD_TEARDOWN_DEFECT, job not completed, run stops, outcome exposes it
{ const r = await runHarness(base({ backlog: [job("t1"), job("t2")], dispatch: async () => ({ ok: true, tree_gone: false, provider_outcome: { tree_gone: false } }) }));
  ok("24 tree_gone=false -> HELD_TEARDOWN_DEFECT (job not completed)", r.jobResults.t1.state === "HELD_TEARDOWN_DEFECT" && r.completed_count === 0);
  ok("25 teardown defect -> outcome_status HELD_TEARDOWN_DEFECT + verified false + teardown_clean false", r.outcome_status === "HELD_TEARDOWN_DEFECT" && r.verified_productive_run === false && r.teardown_clean === false);
  ok("26 teardown defect stops scheduling new jobs (t2 not run)", r.jobResults.t2 === undefined); }
// zero productive completions must NOT be VERIFIED
{ const r = await runHarness(base({ backlog: [job("z", { max_attempts: 1 })], checker: async (j, bs, a, gc) => ({ result: "INSUFFICIENT_EVIDENCE", session: { session_id: "cz" + a, prompt_digest: "cpz" + a, read_only: true } }) }));
  ok("27 zero productive completions is NOT VERIFIED_PRODUCTIVE_RUN", r.completed_count === 0 && r.verified_productive_run === false && r.outcome_status !== "VERIFIED_PRODUCTIVE_RUN"); }
// a genuine completion -> VERIFIED_PRODUCTIVE_RUN
{ const r = await runHarness(base({ backlog: [job("ok1")] }));
  ok("28 completed job -> VERIFIED_PRODUCTIVE_RUN + productive_jobs_completed 1", r.completed_count === 1 && r.outcome_status === "VERIFIED_PRODUCTIVE_RUN" && r.productive_jobs_completed === 1 && r.teardown_clean === true); }
// controlled deadline stop is labeled accurately (not VERIFIED)
{ let t = NOW; const r = await runHarness(base({ backlog: [job("d1"), job("d2")], liveClock: () => (t += 5_000_000) }));
  ok("29 controlled deadline stop labeled CONTROLLED_DEADLINE_STOP (not VERIFIED)", r.outcome_status === "CONTROLLED_DEADLINE_STOP" && r.verified_productive_run === false); }

// ---- FG-LRCQ-ACT-009/Phase-4: builder-output validation BEFORE machine verification ----
{ const { validateBuilderOutput } = await import("../provider/provider-output.mjs");
  const goodOut = (jid) => ({ schema: "lrcq-builder-output-1", role: "builder", run_id: "run-X", job_id: jid, attempt: 1, session_id: "builder:run-X:" + jid, prompt_digest: "bpd:" + jid, outcome: "SUCCESS", changed_files: ["src/x/" + jid + ".mjs"], tests_requested: [] });
  let mvCalled = 0;
  const bad = await runHarness(base({ backlog: [job("bo1", { max_attempts: 1 })], builderOutputValidator: validateBuilderOutput, machineVerifier: async () => { mvCalled++; return { pass: true }; }, dispatch: async () => ({ ok: true, parsed_output: { schema: "wrong" } }) }));
  ok("30 malformed builder output -> HELD_BUILDER_OUTPUT_INVALID (never reaches MV)", bad.jobResults.bo1.state === "HELD_BUILDER_OUTPUT_INVALID" && mvCalled === 0);
  const good = await runHarness(base({ backlog: [job("bo2")], builderOutputValidator: validateBuilderOutput, dispatch: async (j) => ({ ok: true, parsed_output: goodOut(j.job_id) }) }));
  ok("31 valid bound builder output -> proceeds to completion", good.jobResults.bo2.state === "COMPLETED");
  // identity mismatch (wrong run_id) is held before MV
  const drift = await runHarness(base({ backlog: [job("bo3", { max_attempts: 1 })], builderOutputValidator: validateBuilderOutput, dispatch: async (j) => ({ ok: true, parsed_output: { ...goodOut(j.job_id), run_id: "OTHER" } }) }));
  ok("32 builder output run_id drift -> HELD_BUILDER_OUTPUT_INVALID", drift.jobResults.bo3.state === "HELD_BUILDER_OUTPUT_INVALID"); }

// ---- FG-LRCQ-ACT-012: run-wide budget ledger WIRED INTO runHarness -> CONTROLLED_BUDGET_STOP ----
// Per-session costs are WITHIN each session's reservation (builder cap 0.25, checker cap 0.08). With a
// $0.4 run budget, g1 (0.25 builder + 0.08 checker = 0.33) fits; g2's builder reserve then has < 0.08
// unreserved headroom and is refused -> CONTROLLED_BUDGET_STOP. Cumulative committed spend stays <= cap.
{ const { BudgetLedger } = await import("../run-harness/budget-ledger.mjs");
  const led = new BudgetLedger(0.4);
  const costChecker = async (j, bs, a, gc) => ({ result: gc && gc.signed_activation && Object.keys(gc.signed_activation).length ? "CLEAN" : "INSUFFICIENT_EVIDENCE", provider_cost_usd: 0.08, session: { session_id: "c:" + j.job_id + ":" + a, prompt_digest: "cp:" + j.job_id + ":" + a, read_only: true } });
  const r = await runHarness(base({ backlog: [job("g1"), job("g2")], budgetLedger: led, dispatch: async () => ({ ok: true, provider_cost_usd: 0.25 }), checker: costChecker }));
  ok("33 run-wide budget wired: g1 completes, g2 -> CONTROLLED_BUDGET_STOP (cumulative <= cap)", r.jobResults.g1.state === "COMPLETED" && r.outcome_status === "CONTROLLED_BUDGET_STOP" && led.spent() <= 0.4 && r.jobResults.g2.state === "CONTROLLED_BUDGET_STOP");
  ok("34 budget stop is NOT a verified productive run", r.verified_productive_run === false); }
// 35: the per-session ledger reservation is stamped on the job so the dispatch can hard-cap the CLI at
// the per-session cap (NOT the whole run budget). Prove the builder dispatch actually receives it.
{ const { BudgetLedger } = await import("../run-harness/budget-ledger.mjs");
  const led = new BudgetLedger(10); let seenBuilderCap = null;
  await runHarness(base({ backlog: [job("cap1")], budgetLedger: led, dispatch: async (j) => { seenBuilderCap = j.__builder_session_cap; return { ok: true, provider_cost_usd: 0.1 }; }, checker: async (j, bs, a, gc) => ({ result: "CLEAN", provider_cost_usd: 0.05, session: { session_id: "c:" + j.job_id, prompt_digest: "cp:" + j.job_id, read_only: true } }) }));
  ok("35 builder dispatch receives its per-session cap (<= builder cost cap, NOT the $10 run budget)", seenBuilderCap === 0.25); }
// 36: a session that reports NO cost does not silently commit $0 — the ledger records HELD_COST_EVIDENCE_MISSING.
{ const { BudgetLedger } = await import("../run-harness/budget-ledger.mjs");
  const led = new BudgetLedger(10);
  await runHarness(base({ backlog: [job("nc1")], budgetLedger: led, dispatch: async () => ({ ok: true /* no provider_cost_usd */ }), checker: async (j, bs, a) => ({ result: "CLEAN", provider_cost_usd: 0.05, session: { session_id: "c:" + j.job_id, prompt_digest: "cp:" + j.job_id, read_only: true } }) }));
  ok("36 missing builder cost -> ledger records HELD_COST_EVIDENCE_MISSING (never a silent $0)", led.records.some((x) => x.event === "HELD_COST_EVIDENCE_MISSING" && x.role === "builder")); }

console.log("\nLRCQ ACTIVATION-PATH SELFTEST: " + (n - fails.length) + "/" + n + " passed");
if (fails.length) { console.log("FAILED: " + fails.join(", ")); process.exit(1); }
process.exit(0);
