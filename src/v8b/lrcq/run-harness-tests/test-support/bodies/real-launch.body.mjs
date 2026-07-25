// FounderGate LRCQ — TEST-SUPPORT body: the REAL-mode fail-closed contract (migrated to V4 by
// FG-LRCQ-ACT-029) executed under a GENUINE SUPERVISOR_EXECUTION capability. REAL mode requires explicit
// non-null seams AND the V4 capability; the seams here are DETERMINISTIC non-null implementations (never real
// Claude) — REAL mode is about seam PRESENCE + no synthetic inference, not about forcing a live model.
import { mkdtempSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runHarness, RUNTIME_KIND, REQUIRED_REAL_SEAMS } from "../../../run-harness/harness.mjs";
import { standardChecks } from "../../../run-harness/setup-pipeline.mjs";
import * as SEAMS from "../../../run-harness/real-seams.mjs";
import { projectLegacyActivationV4 } from "../../../run-harness/v4-legacy-projection.mjs";

export default async function bodyFn(cap, args) {
  const checks = [];
  const ok = (name, cond, detail) => checks.push({ name, ok: !!cond, detail: cond ? undefined : detail });
  const RID = cap.run_id;
  const NOW = cap.issued_epoch + 100, DEADLINE = cap.hard_deadline_epoch;
  const MAN = { repository_root: args.base, branch_prefix: "lane/", permitted_worktree_root: "/wt", evidence_root: "/ev", per_job_timeout_s: 2700, termination_grace_s: 30, output_cap_bytes: 1048576, max_parallel_width: 2, max_cost_usd: 5 };
  const LOADED = { allowed_tools_manifest_path: { builder: ["Read"], checker: ["Read", "Grep"] } };
  const PROJ = projectLegacyActivationV4(cap, MAN, LOADED, "builder", { evidenceRoot: "/ev" });
  const bindings = { lrcq_base_sha: cap.lrcq_base_sha, lrcq_base_tree: cap.lrcq_base_tree, provider_candidate_sha: cap.provider_candidate_sha, provider_candidate_tree: cap.provider_candidate_tree, run_harness_candidate_sha: cap.evaluated_candidate, run_harness_candidate_tree: cap.evaluated_candidate_tree, assurance_control_backlog_digest: "MD", first_real_run_backlog_digest: cap.backlog_digest, provider_path: cap.provider_executable_path, provider_identity: cap.provider_identity, now_epoch: NOW, candidate_stack: cap.evaluated_candidate };
  const lease = () => ({ lease_id: "L1", run_id: RID, job_id: null, role: "builder", candidate_stack: cap.evaluated_candidate, branch: null, worktree: null, allowed_files: ["src/"], allowed_tools: ["Read"], denied_tools: ["Bash"], effect_class: "LOCAL_FS", deadline_epoch: DEADLINE, max_cost_usd: 5, max_files: 10, max_changed_lines: 500, max_external_calls: 0, max_delegation_depth: 1, evidence_dir: "/ev", uses_remaining: 1000, single_use: false, expiry_epoch: cap.expiry_epoch, revoked: false });
  const blast = () => ({ max_files: 200, max_changed_lines: 9000, max_branches: 60, max_worktrees: 60, max_external_calls: 0, max_recipients: 0, max_dollars: 10, max_records: 100, max_execution_s: 18000, max_delegation_depth: 1, max_output_bytes: 10485760 });
  const job = (id, over = {}) => ({ job_id: id, title: "t", objective: "o", done_meaning: "d", source: "s", risk_class: "WIDE_SAFE", effect_class: "LOCAL_FS", dependencies: [], allowed_files: ["src/x/" + id + ".mjs"], forbidden_files: [], branch: "lane/" + id, worktree: "/wt/" + id, expected_outputs: ["x"], tests: ["t"], required_evidence: ["e"], checker_requirement: "ind", gate_trigger: "NONE", estimated_minutes: 5, max_attempts: 3, correction_cycle: 0, status: "PENDING", ...over });
  const setupChecks = () => { const e = { host_model: "Mac16,11", repo_origin_ok: true, lrcq_base_ok: true, provider_candidate_ok: true, run_harness_candidate_ok: true, master_digest: "M", expected_master_digest: "M", frr_digest: "F", expected_frr_digest: "F", provider_identity: "ID", expected_provider_identity: "ID", active_run: false, lock_acquired: true, run_id: RID, evidence_root: "/ev", ledger_ready: true, replay_ready: true, tx_registry_ready: true, branches_ok: true, worktrees_ok: true, identity_ok: true, controller_real: true, backlog_loaded: true, dep_graph_ok: true, console_started: true, ready_recorded: true, scheduling_allowed: true }; return { ...standardChecks(e), validate_activation_record: () => ({ ok: true }), validate_capability_lease: () => ({ ok: true }), validate_blast_budget: () => ({ ok: true }) }; };
  const mkTmp = () => { const d = mkdtempSync(join(tmpdir(), "lrcq-real-")); return { ledger_path: join(d, "l.jsonl"), recovery_state_path: join(d, "r.json"), transaction_registry_path: join(d, "tx.jsonl"), replay_stream_path: join(d, "rp.jsonl"), evidence_index_path: join(d, "ei.jsonl"), next_safe_action_path: join(d, "nsa.txt"), dir: d }; };
  const seams = (over = {}) => { const p = mkTmp(); return {
    setupChecks: setupChecks(), lockManager: { acquire: () => ({ ok: true }), release: () => {} }, liveClock: () => NOW,
    controlReader: () => ({ pause: false, stop: false }), evidenceWriter: SEAMS.durableEvidenceWriter(p), recoveryWriter: SEAMS.durableRecoveryWriter(p),
    transactionWriter: SEAMS.durableTransactionWriter(p), replayWriter: SEAMS.durableReplayWriter(p),
    machineVerifier: async () => ({ pass: true }), checker: async (j, bs, a) => ({ result: "CLEAN", session: { session_id: "c:" + j.job_id + ":" + a, prompt_digest: "cp:" + j.job_id + ":" + a, read_only: true } }),
    dispatch: async () => ({ ok: true }), teardownVerifier: async () => ({ torn_down: true }), _paths: p, ...over }; };
  const realBase = (over = {}) => ({ run_id: RID, runtime_kind: RUNTIME_KIND.REAL, executionCapability: cap, activation: PROJ, bindings, now: NOW, deadlineEpoch: DEADLINE, maxWidth: 2, master_digest: "MD", lease_digest: "ld", blast_digest: "bd", lease: lease(), blast_budget: blast(), backlog: [job("j1")], ...seams(), ...over });

  // ---- seam-presence fail-closed (REAL mode) ----
  for (const s of REQUIRED_REAL_SEAMS) {
    const cfg = realBase(); cfg[s] = null;
    const r = await runHarness(cfg);
    ok("seam '" + s + "' missing -> ACTIVATION_REFUSED", !r.ready && r.refused.stage === "real_seam_check" && !r.dispatched);
  }

  // 1-2. backlog
  ok("01 null backlog refused (empty not signed)", (await runHarness(realBase({ backlog: [] }))).refused.stage === "controller_real_init");
  { const a = { ...PROJ, intentional_empty_run: true }; ok("02 empty backlog allowed only when signed intentional-empty", (await runHarness(realBase({ backlog: [], activation: a }))).ready === true); }
  // 3. wrong backlog digest handled at manifest layer (see 33/34 packet tests) — here prove malformed backlog refuses
  ok("03 malformed backlog refused fail-closed", (await runHarness(realBase({ backlog: [job("b", { gate_trigger: "NOPE" })] }))).refused.stage === "controller_real_init");
  // 4-7. lease/blast
  ok("04 null lease refused", (await runHarness(realBase({ lease: null }))).refused.stage === "validate_capability_lease");
  ok("05 revoked lease refused", (await runHarness(realBase({ lease: { ...lease(), revoked: true } }))).refused.reasons.includes("lease revoked"));
  ok("06 null blast budget refused", (await runHarness(realBase({ blast_budget: null }))).refused.stage === "validate_blast_budget");
  { const b = blast(); delete b.max_files; ok("07 malformed blast budget refused", (await runHarness(realBase({ blast_budget: b }))).refused.stage === "validate_blast_budget"); }
  // 8-9. setup + lock
  { const c = setupChecks(); c.verify_host = () => ({ ok: false }); ok("08 missing/failed setup step refused", (await runHarness(realBase({ setupChecks: c }))).refused.stage === "setup_pipeline"); }
  ok("09 missing setup verifier fails closed", (await (async () => { const c = setupChecks(); delete c.acquire_run_lock; return runHarness(realBase({ setupChecks: c })); })()).refused.stage === "setup_pipeline");
  ok("10 active lock refused", (await runHarness(realBase({ lockManager: { acquire: () => ({ ok: false, reason: "live" }), release: () => {} } }))).refused.stage === "acquire_run_lock");
  // 11-16 already covered by seam-presence loop (liveClock/controlReader/writers/verifier/checker null -> refused)
  ok("11-16 required real seams enforced (see seam-presence loop above)", REQUIRED_REAL_SEAMS.length === 12);
  // 19. undefined checker output -> INSUFFICIENT_EVIDENCE (never CLEAN)
  { const r = await runHarness(realBase({ backlog: [job("u", { max_attempts: 1 })], checker: async () => ({}) })); ok("19 undefined checker output -> not CLEAN (parks)", r.jobResults.u.state === "PARKED" && r.jobResults.u.checker_result === "INSUFFICIENT_EVIDENCE"); }
  // 20. provider SUCCESS without machine-verifier PASS does not advance
  { const r = await runHarness(realBase({ backlog: [job("mv", { max_attempts: 1 })], machineVerifier: async () => ({ pass: false }), dispatch: async () => ({ ok: true }) })); ok("20 provider SUCCESS w/o machine-verifier PASS does not advance", r.jobResults.mv.state === "PARKED"); }
  // 21. provider SUCCESS without checker CLEAN does not complete
  { const r = await runHarness(realBase({ backlog: [job("ck", { max_attempts: 1 })], checker: async (j, bs, a) => ({ result: "FINDINGS", session: { session_id: "c" + a, prompt_digest: "cp" + a, read_only: true } }) })); ok("21 provider SUCCESS w/o checker CLEAN does not complete", r.jobResults.ck.state === "PARKED"); }
  // 22. builder and checker session identities differ
  { let sameThrew = false; try { await runHarness(realBase({ backlog: [job("s1")], checker: async () => ({ result: "CLEAN", session: { session_id: "builder:run-X:s1", prompt_digest: "x", read_only: true } }) })); } catch (e) { sameThrew = /independent|builder/.test(e.message); }
    const r2 = await runHarness(realBase({ backlog: [job("s2")] }));
    ok("22 builder/checker sessions differ (shared -> throws; distinct -> completes)", sameThrew && r2.jobResults.s2.state === "COMPLETED"); }
  // 23. checker lease read-only + single-use, minted from the governed context (real checker route)
  { const gc = { signed_activation: PROJ, execution_capability: cap, bindings, job_id: "cl", attempt: 1, branch: "lane/cl", worktree: "/wt/cl", evidence_dir: "/ev", builder_session: { session_id: "b" }, builder_prompt_digest: "bp" };
    const route = SEAMS.realIndependentCheckerRoute({ dispatchCheckerSession: async (j, cl) => ({ verdict: cl.role === "checker" && cl.read_only === true && cl.single_use === true && cl.uses_remaining === 0 && cl.denied_tools.includes("Write") ? "CLEAN" : "FINDINGS" }) });
    const res = await route(job("cl"), { session_id: "b", prompt_digest: "bp" }, 1, gc);
    ok("23 checker lease minted read-only + single-use + consumed from governed context", res.result === "CLEAN" && res.session.read_only === true && typeof res.checker_lease_id === "string"); }
  // 23b: checker route refuses when the governed context lacks a signed activation
  { const route = SEAMS.realIndependentCheckerRoute({ dispatchCheckerSession: async () => ({ verdict: "CLEAN" }) });
    const res = await route(job("na"), { session_id: "b", prompt_digest: "bp" }, 1, { job_id: "na", attempt: 1 });
    ok("23b checker route -> INSUFFICIENT_EVIDENCE without signed activation (never CLEAN)", res.result === "INSUFFICIENT_EVIDENCE"); }
  // 23c: reused checker lease refused
  { const consumed = new Set(); const gc = { signed_activation: PROJ, execution_capability: cap, bindings, job_id: "re", attempt: 1, branch: "lane/re", worktree: "/wt/re", evidence_dir: "/ev", builder_session: { session_id: "b" }, builder_prompt_digest: "bp" };
    const route = SEAMS.realIndependentCheckerRoute({ consumed, dispatchCheckerSession: async () => ({ verdict: "CLEAN" }) });
    const r1 = await route(job("re"), { session_id: "b", prompt_digest: "bp" }, 1, gc);
    const r2 = await route(job("re"), { session_id: "b", prompt_digest: "bp" }, 1, gc); // same lease_id -> reuse
    ok("23c reused checker lease refused (single-use)", r1.result === "CLEAN" && r2.result === "INSUFFICIENT_EVIDENCE"); }
  // 23d: ISOLATE the signed-activation guard. A WELL-FORMED governed context (valid branch/worktree/
  // bindings/evidence_dir -> the checker lease mints + validates cleanly) that lacks ONLY signed_activation
  // must still refuse. Unlike 23b (which omits branch/worktree and is thus backstopped by lease
  // validation), this proves the signed_activation check is the DECISIVE gate: remove it and this goes CLEAN.
  { const gcNoSig = { bindings, job_id: "wf", attempt: 1, branch: "lane/wf", worktree: "/wt/wf", evidence_dir: "/ev", builder_session: { session_id: "b" }, builder_prompt_digest: "bp" };
    const route = SEAMS.realIndependentCheckerRoute({ dispatchCheckerSession: async () => ({ verdict: "CLEAN" }) });
    const res = await route(job("wf"), { session_id: "b", prompt_digest: "bp" }, 1, gcNoSig);
    ok("23d well-formed gc lacking ONLY signed_activation -> INSUFFICIENT_EVIDENCE (guard is decisive, not lease-backstopped)", res.result === "INSUFFICIENT_EVIDENCE" && /signed activation/.test(res.reason || "")); }
  // 24-27. pause/stop/deadline observed live (between/during jobs)
  ok("24 pause observed between jobs", (await runHarness(realBase({ backlog: [job("p1"), job("p2")], controlReader: () => ({ pause: true, stop: false }) }))).final_state === "PAUSED");
  ok("25 stop observed between jobs", (await runHarness(realBase({ backlog: [job("s1"), job("s2")], controlReader: () => ({ pause: false, stop: true }) }))).final_state === "STOPPED_BY_STOP");
  { let t = NOW; const r = await runHarness(realBase({ backlog: [job("d1"), job("d2"), job("d3")], liveClock: () => (t += 5_000_000) })); ok("26 deadline observed between jobs", r.final_state === "STOPPED_DEADLINE"); }
  { let calls = 0; const r = await runHarness(realBase({ backlog: [job("dw", { max_attempts: 1 })], liveClock: () => { calls++; return calls >= 3 ? DEADLINE + 1 : NOW; }, dispatch: async () => ({ ok: true }) })); ok("27 deadline observed during a worker (pre-intent clock parks the job)", r.jobResults.dw && r.jobResults.dw.state === "PARKED" && /deadline/.test(r.jobResults.dw.reason)); }
  // 28. crash after dispatch does not refire
  { const reg = {}; const r = await runHarness(realBase({ backlog: [job("cr")], txByKey: reg, dispatch: async () => ({ uncertain: true, obs: { dispatch_exists: true, process_alive: false, definitive_result: false } }) }));
    ok("28 crash after dispatch -> NEEDS_RECONCILIATION, not refired", r.jobResults.cr.reconciliation === "NEEDS_RECONCILIATION" && r.jobResults.cr.resumed === false && Object.keys(reg).length === 1); }
  // 29. disk recovery reconstructs exact state (durable writers wrote it)
  { const s = seams(); const r = await runHarness(realBase({ ...s, backlog: [job("dk")] })); const rec = existsSync(s._paths.recovery_state_path) ? JSON.parse(readFileSync(s._paths.recovery_state_path, "utf8")) : null; const tx = existsSync(s._paths.transaction_registry_path) ? readFileSync(s._paths.transaction_registry_path, "utf8") : "";
    ok("29 durable disk evidence reconstructs state (recovery+tx on disk)", rec && rec.final_state === "STOPPED_EXHAUSTED" && /SEALED/.test(tx) && r.completed_count === 1); }
  // 35. evidence written continuously (ledger has multiple stages, not only final)
  { const s = seams(); await runHarness(realBase({ ...s, backlog: [job("e1"), job("e2")] })); const ledger = existsSync(s._paths.ledger_path) ? readFileSync(s._paths.ledger_path, "utf8").trim().split("\n") : []; ok("35 evidence written continuously (>=4 durable records)", ledger.length >= 4); }


  ok("31 real backlog is non-null in the REAL happy path", (await runHarness(realBase())).completed_count === 1);
  ok("32 real lease + blast are non-null in the REAL happy path", (await runHarness(realBase())).ready === true);

  return { checks };
}
