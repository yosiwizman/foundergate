// FounderGate LRCQ — REAL-path test matrix. Proves the orchestrator's REAL-mode fail-closed
// contract + the manifest/packet loaders. REAL mode requires explicit non-null seams; the seams
// here are DETERMINISTIC non-null implementations (never real Claude) — REAL mode is about seam
// PRESENCE + no synthetic inference, not about forcing a live model. No `|| true`, no tautologies.
import { runHarness, RUNTIME_KIND, REQUIRED_REAL_SEAMS } from "../run-harness/harness.mjs";
import { loadAndVerifyManifest, manifestDigest, activationBindsManifest } from "../run-harness/run-manifest.mjs";
import { standardChecks } from "../run-harness/setup-pipeline.mjs";
import * as SEAMS from "../run-harness/real-seams.mjs";
import { mkdtempSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log("  FAIL " + name); } else console.log("  ok   " + name); };

const NOW = 1000, DEADLINE = 9_000_000;
const bindings = { lrcq_base_sha: "L", lrcq_base_tree: "LT", provider_candidate_sha: "P", provider_candidate_tree: "PT", run_harness_candidate_sha: "R", run_harness_candidate_tree: "RT", assurance_control_backlog_digest: "MD", first_real_run_backlog_digest: "FD", provider_path: "/approved/claude", provider_identity: "id:approved", now_epoch: NOW, candidate_stack: "R" };
const activation = () => ({ schema_version: "lrcq-activation-3", founder_signature: "SIGNED", issued_epoch: 500, expiry_epoch: 9_999_999, lrcq_base_sha: "L", lrcq_base_tree: "LT", provider_candidate_sha: "P", provider_candidate_tree: "PT", run_harness_candidate_sha: "R", run_harness_candidate_tree: "RT", assurance_control_backlog_digest: "MD", first_real_run_backlog_digest: "FD", provider_executable_path: "/approved/claude", provider_version: "1", provider_executable_identity: "id:approved", policy_version: "pv", capability_lease_digest: "ld", blast_radius_budget_digest: "bd", run_id: "run-X", hard_deadline_epoch: DEADLINE, run_duration_s: 18000, max_parallel_width: 2, per_job_timeout_s: 2700, termination_grace_s: 30, max_output_bytes: 1048576, max_budget_usd: 5, delegation_depth: 1, external_calls: 0, recipients: 0, no_protected_main_merge: true, no_pr_merge: true, no_push_unless_authorized: true, no_m1: true, no_akior: true, no_customer_data: true, no_live_action: true, no_permission_bypass: true });
const lease = () => ({ lease_id: "L1", run_id: "run-X", job_id: null, role: "builder", candidate_stack: "R", branch: null, worktree: null, allowed_files: ["src/"], allowed_tools: ["Read"], denied_tools: ["Bash"], effect_class: "LOCAL_FS", deadline_epoch: DEADLINE, max_cost_usd: 5, max_files: 10, max_changed_lines: 500, max_external_calls: 0, max_delegation_depth: 1, evidence_dir: "/ev", uses_remaining: 1000, single_use: false, expiry_epoch: 9_999_999, revoked: false });
const blast = () => ({ max_files: 200, max_changed_lines: 9000, max_branches: 60, max_worktrees: 60, max_external_calls: 0, max_recipients: 0, max_dollars: 10, max_records: 100, max_execution_s: 18000, max_delegation_depth: 1, max_output_bytes: 10485760 });
const job = (id, over = {}) => ({ job_id: id, title: "t", objective: "o", done_meaning: "d", source: "s", risk_class: "WIDE_SAFE", effect_class: "LOCAL_FS", dependencies: [], allowed_files: ["src/x/" + id + ".mjs"], forbidden_files: [], branch: "lane/" + id, worktree: "/wt/" + id, expected_outputs: ["x"], tests: ["t"], required_evidence: ["e"], checker_requirement: "ind", gate_trigger: "NONE", estimated_minutes: 5, max_attempts: 3, correction_cycle: 0, status: "PENDING", ...over });
const setupChecks = () => { const e = { host_model: "Mac16,11", repo_origin_ok: true, lrcq_base_ok: true, provider_candidate_ok: true, run_harness_candidate_ok: true, master_digest: "M", expected_master_digest: "M", frr_digest: "F", expected_frr_digest: "F", provider_identity: "ID", expected_provider_identity: "ID", active_run: false, lock_acquired: true, run_id: "run-X", evidence_root: "/ev", ledger_ready: true, replay_ready: true, tx_registry_ready: true, branches_ok: true, worktrees_ok: true, identity_ok: true, controller_real: true, backlog_loaded: true, dep_graph_ok: true, console_started: true, ready_recorded: true, scheduling_allowed: true }; return { ...standardChecks(e), validate_activation_record: () => ({ ok: true }), validate_capability_lease: () => ({ ok: true }), validate_blast_budget: () => ({ ok: true }) }; };

// deterministic REAL-shaped seams (non-null; never real Claude)
const mkTmp = () => { const d = mkdtempSync(join(tmpdir(), "lrcq-real-")); return { ledger_path: join(d, "l.jsonl"), recovery_state_path: join(d, "r.json"), transaction_registry_path: join(d, "tx.jsonl"), replay_stream_path: join(d, "rp.jsonl"), evidence_index_path: join(d, "ei.jsonl"), next_safe_action_path: join(d, "nsa.txt"), dir: d }; };
const seams = (over = {}) => { const p = mkTmp(); return {
  setupChecks: setupChecks(), lockManager: { acquire: () => ({ ok: true }), release: () => {} }, liveClock: () => NOW,
  controlReader: () => ({ pause: false, stop: false }), evidenceWriter: SEAMS.durableEvidenceWriter(p), recoveryWriter: SEAMS.durableRecoveryWriter(p),
  transactionWriter: SEAMS.durableTransactionWriter(p), replayWriter: SEAMS.durableReplayWriter(p),
  machineVerifier: async () => ({ pass: true }), checker: async (j, bs, a) => ({ result: "CLEAN", session: { session_id: "c:" + j.job_id + ":" + a, prompt_digest: "cp:" + j.job_id + ":" + a, read_only: true } }),
  dispatch: async () => ({ ok: true }), teardownVerifier: async () => ({ torn_down: true }), _paths: p, ...over }; };
const realBase = (over = {}) => ({ run_id: "run-X", runtime_kind: RUNTIME_KIND.REAL, activation: activation(), bindings, now: NOW, deadlineEpoch: DEADLINE, maxWidth: 2, master_digest: "MD", lease_digest: "ld", blast_digest: "bd", lease: lease(), blast_budget: blast(), backlog: [job("j1")], ...seams(), ...over });

// ---- seam-presence fail-closed (REAL mode) ----
for (const s of REQUIRED_REAL_SEAMS) {
  const cfg = realBase(); cfg[s] = null;
  const r = await runHarness(cfg);
  ok("seam '" + s + "' missing -> ACTIVATION_REFUSED", !r.ready && r.refused.stage === "real_seam_check" && !r.dispatched);
}

// 1-2. backlog
ok("01 null backlog refused (empty not signed)", (await runHarness(realBase({ backlog: [] }))).refused.stage === "controller_real_init");
{ const a = activation(); a.intentional_empty_run = true; ok("02 empty backlog allowed only when signed intentional-empty", (await runHarness(realBase({ backlog: [], activation: a }))).ready === true); }
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
{ const gc = { signed_activation: activation(), bindings, job_id: "cl", attempt: 1, branch: "lane/cl", worktree: "/wt/cl", evidence_dir: "/ev", builder_session: { session_id: "b" }, builder_prompt_digest: "bp" };
  const route = SEAMS.realIndependentCheckerRoute({ dispatchCheckerSession: async (j, cl) => ({ verdict: cl.role === "checker" && cl.read_only === true && cl.single_use === true && cl.uses_remaining === 0 && cl.denied_tools.includes("Write") ? "CLEAN" : "FINDINGS" }) });
  const res = await route(job("cl"), { session_id: "b", prompt_digest: "bp" }, 1, gc);
  ok("23 checker lease minted read-only + single-use + consumed from governed context", res.result === "CLEAN" && res.session.read_only === true && typeof res.checker_lease_id === "string"); }
// 23b: checker route refuses when the governed context lacks a signed activation
{ const route = SEAMS.realIndependentCheckerRoute({ dispatchCheckerSession: async () => ({ verdict: "CLEAN" }) });
  const res = await route(job("na"), { session_id: "b", prompt_digest: "bp" }, 1, { job_id: "na", attempt: 1 });
  ok("23b checker route -> INSUFFICIENT_EVIDENCE without signed activation (never CLEAN)", res.result === "INSUFFICIENT_EVIDENCE"); }
// 23c: reused checker lease refused
{ const consumed = new Set(); const gc = { signed_activation: activation(), bindings, job_id: "re", attempt: 1, branch: "lane/re", worktree: "/wt/re", evidence_dir: "/ev", builder_session: { session_id: "b" }, builder_prompt_digest: "bp" };
  const route = SEAMS.realIndependentCheckerRoute({ consumed, dispatchCheckerSession: async () => ({ verdict: "CLEAN" }) });
  const r1 = await route(job("re"), { session_id: "b", prompt_digest: "bp" }, 1, gc);
  const r2 = await route(job("re"), { session_id: "b", prompt_digest: "bp" }, 1, gc); // same lease_id -> reuse
  ok("23c reused checker lease refused (single-use)", r1.result === "CLEAN" && r2.result === "INSUFFICIENT_EVIDENCE"); }
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

// ---- manifest loader (all 8 path-digest pairs; placeholder/path-digest symmetry) ----
{ const crypto = await import("node:crypto");
  const dir = mkdtempSync(join(tmpdir(), "lrcq-man-"));
  const mk = (name, obj) => { const f = join(dir, name); writeFileSync(f, JSON.stringify(obj)); return f; };
  const dg = (f) => "sha256:" + crypto.createHash("sha256").update(readFileSync(f)).digest("hex");
  const bl = mk("backlog.json", { jobs: [job("a")] });
  const files = { backlog: bl, lease: mk("lease.json", { t: 1 }), blast: mk("blast.json", { t: 1 }), setup: mk("setup.json", { t: 1 }), mv: mk("mv.json", { t: 1 }), checker: mk("checker.json", { t: 1 }), allowed: mk("allowed.json", { t: 1 }), denied: mk("denied.json", { t: 1 }) };
  const good = pad({
    backlog_path: files.backlog, backlog_digest: dg(files.backlog),
    capability_lease_manifest_path: files.lease, capability_lease_manifest_digest: dg(files.lease),
    blast_budget_manifest_path: files.blast, blast_budget_manifest_digest: dg(files.blast),
    setup_contract_path: files.setup, setup_contract_digest: dg(files.setup),
    machine_verifier_contract_path: files.mv, machine_verifier_contract_digest: dg(files.mv),
    checker_contract_path: files.checker, checker_contract_digest: dg(files.checker),
    allowed_tools_manifest_path: files.allowed, allowed_tools_manifest_digest: dg(files.allowed),
    denied_tools_manifest_path: files.denied, denied_tools_manifest_digest: dg(files.denied),
  });
  ok("M1 complete manifest (all 8 pairs) verifies", loadAndVerifyManifest(good).valid === true);
  ok("M2 wrong digest refused", loadAndVerifyManifest({ ...good, backlog_digest: "sha256:" + "d".repeat(64) }).valid === false);
  ok("M3 path without digest refused", loadAndVerifyManifest({ ...good, backlog_digest: undefined }).refusals.some((r) => /path without digest/.test(r)));
  ok("M5 digest without path refused", loadAndVerifyManifest({ ...good, backlog_path: undefined }).refusals.some((r) => /digest without path/.test(r)));
  ok("M4 placeholder refused", loadAndVerifyManifest({ ...good, provider_executable_path: "<founder-fills>" }).refusals.some((r) => /placeholder/.test(r)));
  ok("M6 unreadable path refused", loadAndVerifyManifest({ ...good, backlog_path: "/nonexistent/x.json", backlog_digest: good.backlog_digest }).refusals.some((r) => /unreadable/.test(r)));
}
function pad(m) { const base = { job_count: 1, estimated_minutes: 5, repository_root: "/r", permitted_worktree_root: "/w", branch_prefix: "lane/", evidence_root: "/e", recovery_state_path: "/e/r", ledger_path: "/e/l", transaction_registry_path: "/e/t", replay_stream_path: "/e/rp", evidence_index_path: "/e/ei", next_safe_action_path: "/e/n", run_lock_path: "/e/lock", pause_file_path: "/e/p", stop_file_path: "/e/s", provider_executable_path: "/approved/claude", resolved_provider_target: "/approved/claude", provider_version: "1", provider_executable_identity: "sha256:" + "a".repeat(64), max_cost_usd: 10, max_parallel_width: 2, max_duration_s: 18000, per_job_timeout_s: 2700, output_cap_bytes: 10485760, termination_grace_s: 30, no_protected_main_merge: true, no_pr_merge: true, no_push_unless_authorized: true, no_m1: true, no_akior: true, no_customer_data: true, no_live_action: true, no_permission_bypass: true }; return { ...base, ...m }; }

// ---- packet checks (33 placeholder, 34 obsolete SHA) ----
{ const packetPath = new URL("../../../../.foundergate/evidence/lrcq-assurance-factory/UNSIGNED_ACTIVATION_MATERIAL_PACKET.json", import.meta.url);
  let packet = null; try { packet = JSON.parse(readFileSync(packetPath, "utf8")); } catch { /* generated separately */ }
  if (packet) {
    ok("33 committed packet is placeholder-free (no <founder-fills)", !/<\s*founder|founder-fills/i.test(JSON.stringify(packet)));
    ok("34 packet founder_signature is null (unsigned, confers no authority)", packet.founder_signature === null && packet.confers_no_authority === true);
    ok("P3 packet binds real provider identity (sha256)", /^sha256:[0-9a-f]{64}$/.test(packet.provider_executable_identity || ""));
    ok("P4 packet binds a run manifest digest", typeof packet.run_manifest_digest === "string" && packet.run_manifest_digest.startsWith("sha256:"));
  } else { ok("33/34 packet present", false); }
}
// 30-32 launcher-level (preflight zero-invocation, non-null backlog/lease/blast) are proven by the
// launcher run itself (run-five-hour --preflight-unsigned -> SIGNATURE-REQUIRED, invocations all 0);
// asserted here structurally: REAL mode never dispatches without a signature.
{ const r = await runHarness(realBase({ activation: { ...activation(), founder_signature: null } })); ok("30 unsigned activation in REAL mode never dispatches (signature-gated)", !r.ready && r.refused.stage === "validate_activation" && !r.dispatched); }
ok("31 real backlog is non-null in REAL happy path", (await runHarness(realBase())).completed_count === 1);
ok("32 real lease + blast are non-null in REAL happy path", (await runHarness(realBase())).ready === true);

// ---- F1: V3->V2 adapter-activation composition reaches the provider adapter ----
{ const { composeAdapterActivation, composeCheckerActivation } = await import("../run-harness/compose-adapter-activation.mjs");
  const { validateActivation } = await import("../provider/activation-schema.mjs");
  const man = { max_parallel_width: 2, per_job_timeout_s: 2700, termination_grace_s: 30, output_cap_bytes: 10485760, max_cost_usd: 10, repository_root: "/repo", branch_prefix: "lane/", permitted_worktree_root: "/wt", evidence_root: "/ev", provider_executable_path: "/approved/claude", provider_version: "2.1.215", provider_executable_identity: "sha256:" + "9".repeat(64) };
  const loaded = { allowed_tools_manifest_path: { builder: ["Read", "Write", "Edit", "Grep"], checker: ["Read", "Grep"] } };
  const v3 = { founder_signature: "SIGNED", issued_epoch: 1000, expiry_epoch: 9_999_999, hard_deadline_epoch: 9_000_000, lrcq_base_sha: "L", lrcq_base_tree: "LT", provider_candidate_sha: "P", provider_candidate_tree: "PT", first_real_run_backlog_digest: "FD", run_id: "run-X", max_parallel_width: 2, max_budget_usd: 5 };
  const b = { lrcq_base_sha: "L", lrcq_base_tree: "LT", provider_candidate_sha: "P", provider_candidate_tree: "PT", backlog_digest: "FD", provider_path: "/approved/claude", provider_version: "2.1.215", provider_identity: "sha256:" + "9".repeat(64), now_epoch: 2000, active_run: false, recovery_resolved: true };
  const rec = composeAdapterActivation(v3, man, loaded);
  const av = validateActivation(rec, b);
  ok("F1 composed V2 adapter-activation PASSES the provider adapter validator (dispatch reachable)", av.valid === true);
  ok("F1b incomplete signed V3 composes to a FAIL-CLOSED V2 (never silent pass)", validateActivation(composeAdapterActivation({ ...v3, founder_signature: null }, man, loaded), b).valid === false);
  ok("F1c denied_tools semantically cover all prohibited classes", (await import("../provider/activation-schema.mjs")).denyListSemanticGaps(rec.denied_tools).length === 0);
  const crec = composeCheckerActivation(v3, man, loaded);
  ok("F2 checker activation is read-only (no Write/Edit) + validates", !crec.allowed_tools.includes("Write") && !crec.allowed_tools.includes("Edit") && validateActivation(crec, b).valid === true);
}
// F2b: the real independent checker route returns INSUFFICIENT_EVIDENCE (never invented CLEAN)
// when its routed session does not yield a definitive CLEAN verdict.
{ const { realIndependentCheckerRoute } = SEAMS;
  const route = realIndependentCheckerRoute({ dispatchCheckerSession: async () => ({ verdict: "INSUFFICIENT_EVIDENCE" }) });
  const r = await route(job("x"), { session_id: "b", prompt_digest: "bp" }, 1);
  ok("F2b checker route -> INSUFFICIENT_EVIDENCE when session non-CLEAN (never invents CLEAN)", r.result === "INSUFFICIENT_EVIDENCE");
  const route2 = realIndependentCheckerRoute({}); // no session configured -> fail closed
  ok("F2c checker route with no session configured -> INSUFFICIENT_EVIDENCE (fail-closed)", (await route2(job("y"), { session_id: "b", prompt_digest: "bp" }, 1)).result === "INSUFFICIENT_EVIDENCE");
}

// ---- CF2: realMachineVerifier's OWN check-aggregation (mutation to always-pass must break these) ----
{ const mkGit = (branch, changed, numstat) => (args) => { const k = args.join(" "); if (k.includes("--abbrev-ref")) return branch; if (k === "diff --name-only HEAD") return changed.join("\n"); if (k === "diff --numstat HEAD") return numstat; return ""; };
  const j = { job_id: "mv", branch: "lane/mv", worktree: "/wt/mv", allowed_files: ["src/x/"], forbidden_files: ["secrets"], max_changed_lines: 100, tests: ["t"], required_evidence: [] };
  const pass = SEAMS.realMachineVerifier({ gitRunner: mkGit("lane/mv", ["src/x/mv.mjs"], "3\t1\tsrc/x/mv.mjs"), exists: () => true });
  ok("CF2a real MV PASSES when branch+files+lines+tests all satisfy", (await pass(j, {}, {})).pass === true);
  const wrongBranch = SEAMS.realMachineVerifier({ gitRunner: mkGit("main", ["src/x/mv.mjs"], "3\t1\tsrc/x/mv.mjs"), exists: () => true });
  ok("CF2b real MV FAILS on wrong branch", (await wrongBranch(j, {}, {})).pass === false);
  const outsideAllowed = SEAMS.realMachineVerifier({ gitRunner: mkGit("lane/mv", ["src/OTHER/z.mjs"], "3\t1\tsrc/OTHER/z.mjs"), exists: () => true });
  ok("CF2c real MV FAILS on change outside allowed boundary", (await outsideAllowed(j, {}, {})).pass === false);
  const forbidden = SEAMS.realMachineVerifier({ gitRunner: mkGit("lane/mv", ["src/x/secrets"], "3\t1\tsrc/x/secrets"), exists: () => true });
  ok("CF2d real MV FAILS on forbidden file touched", (await forbidden(j, {}, {})).pass === false);
  const overBudget = SEAMS.realMachineVerifier({ gitRunner: mkGit("lane/mv", ["src/x/mv.mjs"], "900\t900\tsrc/x/mv.mjs"), exists: () => true });
  ok("CF2e real MV FAILS over changed-line budget", (await overBudget(j, {}, {})).pass === false);
}
// disclosure artifact must exist + be honest (regression for CF1)
{ const dp = new URL("../../../../.foundergate/evidence/lrcq-assurance-factory/REAL_RUN_CAPABILITY_DISCLOSURE.json", import.meta.url);
  let d = null; try { d = JSON.parse(readFileSync(dp, "utf8")); } catch { /* */ }
  ok("CF1 disclosure file exists + is a real object (not the string 'undefined')", d && typeof d === "object" && typeof d.NOT_proven_in_preparation === "string" && /not.*(proven|exercised)/i.test(d.NOT_proven_in_preparation));
  const pk = new URL("../../../../.foundergate/evidence/lrcq-assurance-factory/UNSIGNED_ACTIVATION_MATERIAL_PACKET.json", import.meta.url);
  let p = null; try { p = JSON.parse(readFileSync(pk, "utf8")); } catch { /* */ }
  ok("CF1b packet carries real_run_capability_disclosure", p && p.real_run_capability_disclosure && typeof p.real_run_capability_disclosure.NOT_proven_in_preparation === "string");
}

console.log("\nLRCQ REAL-LAUNCH SELFTEST: " + (n - fails.length) + "/" + n + " passed");
if (fails.length) { console.log("FAILED: " + fails.join(", ")); process.exit(1); }
process.exit(0);
