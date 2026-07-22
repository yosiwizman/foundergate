// FounderGate LRCQ Assurance — core + reconciliation + refusal-corpus test matrix.
import { authorityViolations, canWrite, PLANES, validateLease, validateBlastBudget, blastExceeded, validateActivationV3, ACTIVATION_V3_VERSION } from "../assurance/assurance-core.mjs";
import { validateIntent, canDispatch, reconcile, mayResume, branchIsDiagnosticOnly } from "../reconciliation/transaction.mjs";

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log("  FAIL " + name); } else console.log("  ok   " + name); };

// ===== A01 FIVE-PLANE =====
ok("01 authority matrix has zero violations", authorityViolations().length === 0);
import { AUTHORITY_MATRIX } from "../assurance/assurance-core.mjs";
ok("02 no component writes all five planes", Object.values(AUTHORITY_MATRIX).every((planes) => planes.length < PLANES.length));
ok("03 checker is read-only (writes nothing)", !PLANES.some((p) => canWrite("checker_worker", p)));
ok("04 controller cannot write execution plane", !canWrite("controller", "execution"));
ok("05 provider_adapter writes only execution", canWrite("provider_adapter", "execution") && !canWrite("provider_adapter", "control") && !canWrite("provider_adapter", "evidence"));
ok("06 reconciler cannot write control/policy", !canWrite("reconciler", "control"));

// ===== A03 CAPABILITY LEASE =====
const TOOL_A = "ReadTool", TOOL_B = "EditTool", TOOL_DENY = "DeniedToolX", TOOL_UNALLOWED = "UnallowedTool";
const LEASE = (o = {}) => ({ lease_id: "L", run_id: "r", job_id: "j", role: "builder", candidate_stack: "s", branch: "lane/j", worktree: "/wt/j", allowed_files: ["src/x/"], allowed_tools: [TOOL_A, TOOL_B], denied_tools: [TOOL_DENY], effect_class: "LOCAL_FS", deadline_epoch: 9999999999, max_cost_usd: 5, max_files: 10, max_changed_lines: 500, max_external_calls: 0, max_delegation_depth: 1, evidence_dir: "/ev", uses_remaining: 1, single_use: true, expiry_epoch: 9999999999, revoked: false, ...o });
const LB = (o = {}) => ({ run_id: "r", job_id: "j", role: "builder", branch: "lane/j", worktree: "/wt/j", now_epoch: 2000, ...o });
ok("07 valid lease passes", validateLease(LEASE(), LB()).valid);
ok("08 absent lease refused", !validateLease(null, LB()).valid);
ok("09 revoked lease refused", !validateLease(LEASE({ revoked: true }), LB()).valid);
ok("10 expired lease refused", !validateLease(LEASE({ expiry_epoch: 1500 }), LB({ now_epoch: 2000 })).valid);
ok("11 reused single-use lease refused", !validateLease(LEASE({ single_use: true, uses_remaining: 0 }), LB()).valid);
ok("12 wrong run refused", !validateLease(LEASE(), LB({ run_id: "other" })).valid);
ok("13 wrong job refused", !validateLease(LEASE(), LB({ job_id: "other" })).valid);
ok("14 wrong role refused", !validateLease(LEASE(), LB({ role: "checker" })).valid);
ok("15 wrong branch refused", !validateLease(LEASE(), LB({ branch: "lane/other" })).valid);
ok("16 wrong worktree refused", !validateLease(LEASE(), LB({ worktree: "/wt/other" })).valid);
ok("17 file outside lease refused", !validateLease(LEASE(), LB({ file: "src/y/z.mjs" })).valid);
ok("18 widened tool refused", !validateLease(LEASE(), LB({ tool: TOOL_UNALLOWED })).valid);
ok("19 widened effect class refused", !validateLease(LEASE(), LB({ effect_class: "LIVE_ACTION" })).valid);
ok("20 cost overrun refused", !validateLease(LEASE(), LB({ cost_so_far: 6 })).valid);

// ===== B21 BLAST RADIUS =====
const BUD = { max_files: 10, max_changed_lines: 500, max_branches: 1, max_worktrees: 1, max_external_calls: 0, max_recipients: 0, max_dollars: 5, max_records: 3, max_execution_s: 2700, max_delegation_depth: 1, max_output_bytes: 1048576 };
ok("21 valid blast budget passes", validateBlastBudget(BUD).valid);
ok("22 missing blast dimension refused", !validateBlastBudget({ ...BUD, max_files: undefined }).valid);
ok("23 malformed blast dimension refused", !validateBlastBudget({ ...BUD, max_dollars: NaN }).valid);
ok("24 below-limit usage not exceeded", blastExceeded(BUD, { max_files: 5, max_dollars: 4 }).length === 0);
ok("25 at-limit usage not exceeded", blastExceeded(BUD, { max_files: 10 }).length === 0);
ok("26 above-limit usage exceeded (each dimension)", blastExceeded(BUD, { max_files: 11 }).length === 1 && blastExceeded(BUD, { max_dollars: 6, max_output_bytes: 2000000 }).length === 2);

// ===== ACTIVATION V3 (three-layer + upper bounds) =====
const A3 = (o = {}) => ({ schema_version: ACTIVATION_V3_VERSION, founder_signature: "sig", issued_epoch: 1000, expiry_epoch: 9999999999, lrcq_base_sha: "L", lrcq_base_tree: "LT", provider_candidate_sha: "P", provider_candidate_tree: "PT", run_harness_candidate_sha: "H", run_harness_candidate_tree: "HT", assurance_control_backlog_digest: "MD", first_real_run_backlog_digest: "FD", provider_executable_path: "/claude", provider_version: "2.1.215", provider_executable_identity: "ID", policy_version: "pv1", capability_lease_digest: "LD", blast_radius_budget_digest: "BD", run_id: "r", hard_deadline_epoch: 9999999999, run_duration_s: 18000, max_parallel_width: 2, per_job_timeout_s: 2700, termination_grace_s: 30, max_output_bytes: 10485760, max_budget_usd: 10, delegation_depth: 1, external_calls: 0, recipients: 0, no_protected_main_merge: true, no_pr_merge: true, no_push_unless_authorized: true, no_m1: true, no_akior: true, no_customer_data: true, no_live_action: true, no_permission_bypass: true, ...o });
const B3 = (o = {}) => ({ lrcq_base_sha: "L", lrcq_base_tree: "LT", provider_candidate_sha: "P", provider_candidate_tree: "PT", run_harness_candidate_sha: "H", run_harness_candidate_tree: "HT", assurance_control_backlog_digest: "MD", first_real_run_backlog_digest: "FD", provider_path: "/claude", provider_identity: "ID", now_epoch: 2000, ...o });
ok("27 valid v3 activation passes", validateActivationV3(A3(), B3()).valid);
ok("28 wrong run_harness_candidate refused", !validateActivationV3(A3(), B3({ run_harness_candidate_sha: "X" })).valid);
ok("29 wrong provider_candidate refused", !validateActivationV3(A3(), B3({ provider_candidate_sha: "X" })).valid);
ok("30 wrong lrcq_base refused", !validateActivationV3(A3(), B3({ lrcq_base_sha: "X" })).valid);
ok("31 wrong master-backlog digest refused", !validateActivationV3(A3(), B3({ assurance_control_backlog_digest: "X" })).valid);
ok("32 wrong real-run-backlog digest refused", !validateActivationV3(A3(), B3({ first_real_run_backlog_digest: "X" })).valid);
ok("33 no_push false refused", !validateActivationV3(A3({ no_push_unless_authorized: false }), B3()).valid);
ok("34 width>3 refused", !validateActivationV3(A3({ max_parallel_width: 4 }), B3()).valid);
ok("35 budget>10 refused", !validateActivationV3(A3({ max_budget_usd: 11 }), B3()).valid);
ok("36 timeout>2700 refused", !validateActivationV3(A3({ per_job_timeout_s: 2701 }), B3()).valid);
ok("37 duration>18000 refused", !validateActivationV3(A3({ run_duration_s: 18001 }), B3()).valid);
ok("38 output>10MiB refused", !validateActivationV3(A3({ max_output_bytes: 10485761 }), B3()).valid);
ok("39 delegation>1 refused", !validateActivationV3(A3({ delegation_depth: 2 }), B3()).valid);
ok("40 external_calls!=0 refused", !validateActivationV3(A3({ external_calls: 1 }), B3()).valid);
ok("41 recipients!=0 refused", !validateActivationV3(A3({ recipients: 1 }), B3()).valid);

// ===== A02/A10 SIDE-EFFECT + RECONCILIATION =====
const INTENT = (o = {}) => ({ transaction_id: "t", idempotency_key: "k1", run_id: "r", job_id: "j", attempt: 1, role: "builder", candidate_stack: "s", backlog_digest: "d", lease_digest: "ld", blast_budget_digest: "bd", prompt_digest: "pd", tool_digests: "td", worktree: "/wt/j", branch: "lane/j", pre_action_fingerprint: "fp", deadline_epoch: 9999999999, budget_usd: 5, evidence_dir: "/ev", state: "AUTHORIZED", ...o });
ok("42 valid intent passes", validateIntent(INTENT()).valid);
ok("43 intent missing idempotency_key refused", !validateIntent(INTENT({ idempotency_key: undefined })).valid);
ok("44 dispatch impossible without AUTHORIZED intent", !canDispatch(INTENT({ state: "PLANNED" }), {}).ok);
ok("45 dispatch impossible without sealed intent", !canDispatch(INTENT({ transaction_id: undefined }), {}).ok);
ok("46 duplicate idempotency key -> DUPLICATE_PREVENTED", (() => { const r = canDispatch(INTENT(), { k1: { state: "DISPATCHED" } }); return !r.ok && r.duplicate === true; })());
ok("47 fresh key dispatchable", canDispatch(INTENT(), {}).ok);
ok("48 intent-only + worktree-unchanged -> SAFE_TO_RESUME", reconcile({ intent_exists: true, dispatch_exists: false, process_alive: false, worktree_unchanged: true }).state === "SAFE_TO_RESUME");
ok("49 live process -> ACTIVE_PROCESS_FOUND (no duplicate)", reconcile({ dispatch_exists: true, process_alive: true }).state === "ACTIVE_PROCESS_FOUND");
ok("50 dead process + no result -> NEEDS_RECONCILIATION + BRANCH (no re-fire)", (() => { const r = reconcile({ dispatch_exists: true, process_alive: false, definitive_result: false }); return r.state === "NEEDS_RECONCILIATION" && branchIsDiagnosticOnly(r); })());
ok("51 corrupt checkpoint -> HELD (never green)", reconcile({ checkpoint_corrupt: true }).state === "HELD");
ok("52 unknown state -> EXTERNAL_EFFECT_UNKNOWN (never green)", reconcile({}).state === "EXTERNAL_EFFECT_UNKNOWN");
ok("53 result+evidence agree -> RESULT_COMPLETE", reconcile({ definitive_result: true, evidence_agrees: true }).state === "RESULT_COMPLETE");
ok("54 result/evidence disagree -> HELD", reconcile({ definitive_result: true, evidence_agrees: false }).state === "HELD");
ok("55 RESUME only after no-duplicate proof", mayResume(reconcile({ intent_exists: true, worktree_unchanged: true }), true) === true && mayResume(reconcile({ intent_exists: true, worktree_unchanged: true }), false) === false);

console.log("\nLRCQ ASSURANCE-CORE SELFTEST: " + (n - fails.length) + "/" + n + " passed");
if (fails.length) { console.log("FAILED: " + fails.join(", ")); process.exit(1); }
process.exit(0);
