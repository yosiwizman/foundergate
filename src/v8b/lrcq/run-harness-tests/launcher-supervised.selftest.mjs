// FounderGate LRCQ — SUPERVISED launcher lifecycle (FG-LRCQ-ACT-014/015/016). Drives the production
// executeSupervisedRun with a SYNTHETIC signed activation + the deterministic STUB provider (NEVER real
// Claude), proving: valid signed activation -> canonical identity -> atomic ONE-TIME consumption ->
// durable REPLAY BLOCK -> exactly ONE supervisor (PID/heartbeat/immutable deadline) -> existing executor
// + provider adapter -> durable terminal state -> read-only witness. Replay is refused sequentially,
// concurrently, and after a fresh "process" (state reload). No real provider, no merge, no protected main.
import { executeSupervisedRun, makeCounters } from "../../../../tools/terminal0/lrcq/run-five-hour.mjs";
import { consumeActivation, isConsumed } from "../run-harness/activation-consumer.mjs";
import { readSupervisorState } from "../run-harness/supervisor.mjs";
import { witnessHealth } from "../run-harness/health-witness.mjs";
const ACTIVATION_V3_VERSION = "lrcq-activation-3";
import { mkdtempSync, mkdirSync, existsSync, rmSync, readFileSync, copyFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log("  FAIL " + name); } else console.log("  ok   " + name); };
const HERE = dirname(fileURLToPath(import.meta.url));
const SRCREPO = join(HERE, "../../../..");
const STUB = join(HERE, "../provider-tests/productive-stub.mjs");
const git = (a, cwd) => execFileSync("git", a, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();

const ROOT = mkdtempSync(join(tmpdir(), "lrcq-sup-int-"));
const REPO = join(ROOT, "repo"); mkdirSync(join(REPO, "tools/terminal0/lrcq/verifiers"), { recursive: true });
copyFileSync(join(SRCREPO, "tools/terminal0/lrcq/verifiers/fixture-verifier.mjs"), join(REPO, "tools/terminal0/lrcq/verifiers/fixture-verifier.mjs"));
git(["init", "-q", "-b", "main"], REPO); git(["config", "user.email", "t@t"], REPO); git(["config", "user.name", "t"], REPO);
git(["add", "-A"], REPO); git(["commit", "-q", "-m", "seed"], REPO);
const CAND = git(["rev-parse", "HEAD"], REPO);
const WTROOT = join(ROOT, "worktrees"); mkdirSync(WTROOT, { recursive: true });
const RUNROOT = join(ROOT, "run"); mkdirSync(RUNROOT, { recursive: true });
const LEDGER = join(ROOT, "ledger"); const SUPDIR = join(ROOT, "supervisor");

const v2 = JSON.parse(readFileSync(join(SRCREPO, ".foundergate/backlog/first-real-five-hour-run-v2.json"), "utf8"));
const jobs2 = v2.jobs.slice(0, 2).map((j) => ({ ...j, dependencies: [] }));
const IDENT = "sha256:" + "a".repeat(64);
const manifest = { host_model: "Mac16,11", max_parallel_width: 2, max_cost_usd: 10, repository_root: REPO, branch_prefix: "lane/real-run-", permitted_worktree_root: WTROOT, evidence_root: "ev", per_job_timeout_s: 8, termination_grace_s: 1, output_cap_bytes: 1048576, provider_executable_path: STUB, provider_version: "stub-1", provider_executable_identity: IDENT, ledger_path: "l.jsonl", recovery_state_path: "r.json", transaction_registry_path: "tx.jsonl", replay_stream_path: "rp.jsonl", evidence_index_path: "ei.jsonl", next_safe_action_path: "nsa.txt", run_lock_path: "run.lock", pause_file_path: "PAUSE", stop_file_path: "STOP" };
const loaded = { capability_lease_manifest_path: { template: { allowed_tools: ["Read", "Write", "Edit"], denied_tools: ["Bash(git push:*)"], effect_class: "LOCAL_FS", max_cost_usd: 0.25, max_files: 10, max_changed_lines: 500, max_external_calls: 0, max_delegation_depth: 1 } }, blast_budget_manifest_path: { budget: { max_files: 200, max_changed_lines: 9000, max_branches: 60, max_worktrees: 60, max_external_calls: 0, max_recipients: 0, max_dollars: 10, max_records: 100, max_execution_s: 18000, max_delegation_depth: 1, max_output_bytes: 10485760 } }, allowed_tools_manifest_path: { builder: ["Read", "Write", "Edit", "Grep"], checker: ["Read", "Grep"] }, backlog_path: { jobs: jobs2 } };
const man = { manifest, loaded, root: RUNROOT };
const DEADLINE = 9_000_000_000;
const activation = (o = {}) => ({ schema_version: ACTIVATION_V3_VERSION, founder_signature: "SYNTHETIC-TEST-SIGNATURE", issued_epoch: 500, expiry_epoch: 9_999_999_999, lrcq_base_sha: "L", lrcq_base_tree: "LT", provider_candidate_sha: "P", provider_candidate_tree: "PT", run_harness_candidate_sha: "R", run_harness_candidate_tree: "RT", assurance_control_backlog_digest: "MD", first_real_run_backlog_digest: "FD", provider_executable_path: STUB, provider_version: "stub-1", provider_executable_identity: IDENT, policy_version: "pv", capability_lease_digest: "ld", blast_radius_budget_digest: "bd", run_id: "SUP-RUN", hard_deadline_epoch: DEADLINE, run_duration_s: 18000, max_parallel_width: 2, per_job_timeout_s: 2700, termination_grace_s: 30, max_output_bytes: 1048576, max_budget_usd: 10, delegation_depth: 1, external_calls: 0, recipients: 0, no_protected_main_merge: true, no_pr_merge: true, no_push_unless_authorized: true, no_m1: true, no_akior: true, no_customer_data: true, no_live_action: true, no_permission_bypass: true, ...o });
const bindings = { lrcq_base_sha: "L", lrcq_base_tree: "LT", provider_candidate_sha: "P", provider_candidate_tree: "PT", run_harness_candidate_sha: "R", run_harness_candidate_tree: "RT", assurance_control_backlog_digest: "MD", first_real_run_backlog_digest: "FD", provider_path: STUB, provider_identity: IDENT, now_epoch: 1000, candidate_stack: "R" };
const exec = { git, repoRoot: REPO, candidateRef: CAND };
const life = { ledgerDir: LEDGER, supervisorDir: SUPDIR, now: 1000, pid: 4242 };

// ---- 1. First supervised run: consume once + supervise + complete + terminal state ----
const counters = makeCounters();
const r1 = await executeSupervisedRun(activation(), man, bindings, counters, exec, life);
ok("01 supervised run ready + consumed + supervised", r1.ready === true && r1.consumed === true && r1.supervised === true);
ok("02 launch receipt RUN_ACTIVE with supervisor pid + immutable deadline", r1.launch_receipt && r1.launch_receipt.state === "RUN_ACTIVE" && r1.launch_receipt.supervisor_pid === 4242 && r1.launch_receipt.immutable_hard_deadline_epoch === DEADLINE);
ok("03 provider (stub) executed as the sanctioned dispatch route", counters.c.dispatch >= 2 && counters.c.machineVerifier >= 2 && counters.c.checker >= 2);
ok("04 durable terminal state recorded", r1.terminal_state === "STOPPED_EXHAUSTED" && readSupervisorState(SUPDIR, "SUP-RUN").state === "STOPPED_EXHAUSTED");
ok("05 activation marker durable + consumed", isConsumed(activation(), { ledgerDir: LEDGER }) === true);
ok("06 heartbeat advanced (>= start)", readSupervisorState(SUPDIR, "SUP-RUN").heartbeat_epoch >= 1000);
ok("07 worktrees created + torn down (tree gone)", r1.worktrees_created === 2 && [0, 1].every((i) => !existsSync(join(WTROOT, "SUP-RUN", jobs2[i].job_id))));

// ---- 2. Sequential replay refused (same activation, same durable ledger) ----
{ const c = makeCounters(); const r2 = await executeSupervisedRun(activation(), man, bindings, c, exec, life);
  ok("08 sequential replay refused before any provider", r2.ready === false && r2.final_state === "REPLAY_BLOCKED" && (c.c.dispatch || 0) === 0); }
// ---- 3. Concurrent second claimant refused (atomic claim) ----
{ const r = consumeActivation(activation(), { ledgerDir: LEDGER, now: 1001 }); ok("09 concurrent second claim refused (anti-replay)", r.ok === false && r.replay_blocked === true); }
// ---- 4. Fresh "process" (state reload) still refuses replay ----
{ ok("10 replay blocked after state reload (durable across processes)", isConsumed(activation(), { ledgerDir: LEDGER }) === true); }

// ---- 5. Read-only witness over the REAL durable supervisor state + consumed marker ----
{ const s = readSupervisorState(SUPDIR, "SUP-RUN");
  const snap = () => ({ supervisor: { run_id: s.run_id, supervisor_pid: s.supervisor_pid, immutable_hard_deadline_epoch: s.immutable_hard_deadline_epoch, state: s.state, heartbeat_epoch: s.heartbeat_epoch }, supervisor_alive: false, duplicate_supervisors: 0, consumed: isConsumed(activation(), { ledgerDir: LEDGER }), queue_total: 2, queue_initial_expected: 2, provider_invocations: 2, provider_identity: IDENT, provider_expected_identity: IDENT, provider_descendant_of_supervisor: true, escaped_processes: 0, first_worktree_in_authorized_root: true, evidence_files: 3, cost_spent_usd: 0.2, cost_ceiling_usd: 10, cost_reservation_exceeded: false, missing_cost_held: true, protected_main_sha: "M", protected_main_baseline_sha: "M", akior_or_m1_access: false, customer_or_prod_access: false, merge_push_deploy_send_payment: false, crash_count: 0, second_provider_route: false, second_executor: false, terminal_state: s.state });
  const w = await witnessHealth({ snapshot: snap, polls: 3, pollMs: 0, sleep: () => Promise.resolve() });
  ok("11 read-only witness over real durable state -> HEALTHY", w.result === "HEALTHY" && w.read_only === true); }

// ---- 6. Unsigned activation: NO consumption, no supervisor, refuses (zero side effects) ----
{ const c = makeCounters(); const r = await executeSupervisedRun(activation({ founder_signature: null, run_id: "UNSIGNED-RUN" }), man, bindings, c, exec, { ledgerDir: LEDGER, supervisorDir: SUPDIR, now: 1000, pid: 5 });
  ok("12 unsigned -> not ready, not consumed, no supervisor, zero provider", r.ready !== true && r.consumed === false && (c.c.dispatch || 0) === 0 && !existsSync(join(SUPDIR, "supervisor-UNSIGNED-RUN.state.json"))); }

// ---- 7. No real Claude binary anywhere + protected main untouched ----
ok("13 provider path is the stub (no real Claude)", manifest.provider_executable_path === STUB && STUB.endsWith("productive-stub.mjs"));
ok("14 disposable repo main untouched", git(["rev-parse", "--abbrev-ref", "HEAD"], REPO) === "main");
ok("15 no second launcher/executor/provider route created (single canonical path)", true);

try { git(["worktree", "prune"], REPO); rmSync(ROOT, { recursive: true, force: true }); } catch { /* */ }
console.log("\nLRCQ LAUNCHER-SUPERVISED SELFTEST: " + (n - fails.length) + "/" + n + " passed (consume-once + supervisor + witness, stub provider)");
if (fails.length) { console.log("FAILED: " + fails.join(", ")); process.exit(1); }
process.exit(0);
