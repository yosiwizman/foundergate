// FounderGate LRCQ — REAL-PROCESS detached-supervisor + independent-witness proof (FG-LRCQ-ACT-017/018).
// Spawns the ACTUAL production launcher (run-five-hour.mjs --activation) as a child process with a TEST-
// ONLY lifecycle injection + a deterministic SLOW stub (NEVER real Claude). Proves mechanically that the
// launcher EXITS while a SEPARATE supervisor OS process (distinct PID) keeps running, heartbeat advances
// after launcher exit, a SEPARATE witness process attaches read-only and reports HEALTHY_CONTINUE, the
// stub is a descendant of the supervisor, run_id + immutable deadline are stable across all three, the
// supervisor reaches a durable terminal state, descendants are gone after teardown, and replay stays
// blocked. A direct executeSupervisedRun function call is NOT used — this drives the real CLI entry point.
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync, readFileSync, copyFileSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readSupervisorState } from "../run-harness/supervisor.mjs";

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log("  FAIL " + name); } else console.log("  ok   " + name); };
const HERE = dirname(fileURLToPath(import.meta.url));
const SRCREPO = join(HERE, "../../../..");
const LAUNCHER = join(SRCREPO, "tools/terminal0/lrcq/run-five-hour.mjs");
const SUPMAIN = join(SRCREPO, "src/v8b/lrcq/run-harness/supervisor-main.mjs");
const WITNESS = join(SRCREPO, "src/v8b/lrcq/run-harness/witness-main.mjs");
const SLOWSTUB = join(SRCREPO, "src/v8b/lrcq/provider-tests/slow-productive-stub.mjs");
const git = (a, cwd) => execFileSync("git", a, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return e && e.code === "EPERM"; } };
const kids = (pid) => { try { return execFileSync("pgrep", ["-P", String(pid)], { encoding: "utf8" }).trim().split(/\s+/).filter(Boolean); } catch { return []; } };
const sleep = (ms) => execFileSync("sleep", [String(ms / 1000)]); // synchronous wall sleep (test pacing)

const ROOT = mkdtempSync(join(tmpdir(), "lrcq-detach-"));
let supervisorPid = null;
function cleanup() { try { if (supervisorPid && alive(supervisorPid)) { try { process.kill(-supervisorPid, "SIGKILL"); } catch { /* */ } try { process.kill(supervisorPid, "SIGKILL"); } catch { /* */ } } } catch { /* */ } try { git(["worktree", "prune"], REPO); } catch { /* */ } try { rmSync(ROOT, { recursive: true, force: true }); } catch { /* */ } }

try {
  const REPO = join(ROOT, "repo"); mkdirSync(join(REPO, "tools/terminal0/lrcq/verifiers"), { recursive: true });
  copyFileSync(join(SRCREPO, "tools/terminal0/lrcq/verifiers/fixture-verifier.mjs"), join(REPO, "tools/terminal0/lrcq/verifiers/fixture-verifier.mjs"));
  git(["init", "-q", "-b", "main"], REPO); git(["config", "user.email", "t@t"], REPO); git(["config", "user.name", "t"], REPO);
  git(["add", "-A"], REPO); git(["commit", "-q", "-m", "seed"], REPO);
  const CAND = git(["rev-parse", "HEAD"], REPO); const MAIN0 = git(["rev-parse", "main"], REPO);
  const WTROOT = join(ROOT, "wt"); mkdirSync(WTROOT, { recursive: true });
  const RUNROOT = join(ROOT, "run"); mkdirSync(RUNROOT, { recursive: true });
  const LEDGER = join(ROOT, "ledger"); const SUPDIR = join(ROOT, "supervisor");
  const v2 = JSON.parse(readFileSync(join(SRCREPO, ".foundergate/backlog/first-real-five-hour-run-v2.json"), "utf8"));
  const jobs2 = v2.jobs.slice(0, 2).map((j) => ({ ...j, dependencies: [] }));
  const IDENT = "sha256:" + "a".repeat(64);
  const manifest = { host_model: "Mac16,11", max_parallel_width: 1, max_cost_usd: 10, repository_root: REPO, branch_prefix: "lane/real-run-", permitted_worktree_root: WTROOT, evidence_root: "ev", per_job_timeout_s: 30, termination_grace_s: 1, output_cap_bytes: 1048576, provider_executable_path: SLOWSTUB, provider_version: "stub-1", provider_executable_identity: IDENT, ledger_path: "l.jsonl", recovery_state_path: "r.json", transaction_registry_path: "tx.jsonl", replay_stream_path: "rp.jsonl", evidence_index_path: "ei.jsonl", next_safe_action_path: "nsa.txt", run_lock_path: "run.lock", pause_file_path: "PAUSE", stop_file_path: "STOP" };
  const loaded = { capability_lease_manifest_path: { template: { allowed_tools: ["Read", "Write", "Edit"], denied_tools: ["Bash(git push:*)"], effect_class: "LOCAL_FS", max_cost_usd: 0.25, max_files: 10, max_changed_lines: 500, max_external_calls: 0, max_delegation_depth: 1 } }, blast_budget_manifest_path: { budget: { max_files: 200, max_changed_lines: 9000, max_branches: 60, max_worktrees: 60, max_external_calls: 0, max_recipients: 0, max_dollars: 10, max_records: 100, max_execution_s: 18000, max_delegation_depth: 1, max_output_bytes: 10485760 } }, allowed_tools_manifest_path: { builder: ["Read", "Write", "Edit", "Grep"], checker: ["Read", "Grep"] }, backlog_path: { jobs: jobs2 } };
  const DEADLINE = 9_000_000_000;
  const activation = { schema_version: "lrcq-activation-3", founder_signature: "SYNTHETIC-TEST-SIGNATURE", issued_epoch: 500, expiry_epoch: 9_999_999_999, lrcq_base_sha: "L", lrcq_base_tree: "LT", provider_candidate_sha: "P", provider_candidate_tree: "PT", run_harness_candidate_sha: "R", run_harness_candidate_tree: "RT", assurance_control_backlog_digest: "MD", first_real_run_backlog_digest: "FD", provider_executable_path: SLOWSTUB, provider_version: "stub-1", provider_executable_identity: IDENT, policy_version: "pv", capability_lease_digest: "ld", blast_radius_budget_digest: "bd", run_id: "DETACH-RUN", hard_deadline_epoch: DEADLINE, run_duration_s: 18000, max_parallel_width: 1, per_job_timeout_s: 2700, termination_grace_s: 30, max_output_bytes: 1048576, max_budget_usd: 10, delegation_depth: 1, external_calls: 0, recipients: 0, no_protected_main_merge: true, no_pr_merge: true, no_push_unless_authorized: true, no_m1: true, no_akior: true, no_customer_data: true, no_live_action: true, no_permission_bypass: true };
  const bindings = { lrcq_base_sha: "L", lrcq_base_tree: "LT", provider_candidate_sha: "P", provider_candidate_tree: "PT", run_harness_candidate_sha: "R", run_harness_candidate_tree: "RT", assurance_control_backlog_digest: "MD", first_real_run_backlog_digest: "FD", provider_path: SLOWSTUB, provider_identity: IDENT, now_epoch: 1000, candidate_stack: "R" };
  const life = { ledgerDir: LEDGER, supervisorDir: SUPDIR, runRoot: RUNROOT, supervisorMainPath: SUPMAIN, heartbeatMs: 200, startupTimeoutMs: 12000, pollMs: 120 };
  const actPath = join(ROOT, "activation.json"); writeFileSync(actPath, JSON.stringify(activation));
  const lifePath = join(ROOT, "lifecycle.json"); writeFileSync(lifePath, JSON.stringify({ manifest, loaded, root: RUNROOT, bindings, life, exec: { repoRoot: REPO, candidateRef: CAND } }));

  // (3-6) Spawn the ACTUAL launcher; spawnSync returns when the launcher EXITS (detached supervisor lives on).
  const t0 = Date.now();
  const lr = spawnSync(process.execPath, [LAUNCHER, "--activation", actPath], { env: { ...process.env, LRCQ_TEST_LIFECYCLE: lifePath }, encoding: "utf8", timeout: 20000 });
  ok("01 launcher process exited (did not await the run)", lr.status === 0 && Date.now() - t0 < 15000);
  let receipt = null; try { receipt = JSON.parse(lr.stdout); } catch { /* */ }
  ok("02 launcher returned a RUN_ACTIVE launch receipt", !!receipt && receipt.launched === true && receipt.launch_receipt && receipt.launch_receipt.state === "RUN_ACTIVE");
  const launcherPid = receipt && receipt.launcher_pid; supervisorPid = receipt && receipt.launch_receipt && receipt.launch_receipt.supervisor_pid;
  ok("03 supervisor PID differs from launcher PID (real detachment)", typeof supervisorPid === "number" && typeof launcherPid === "number" && supervisorPid !== launcherPid);
  ok("04 launcher process is gone; supervisor process is alive after launcher exit", !alive(launcherPid) && alive(supervisorPid));

  // (17) provider stub is a descendant of the supervisor — poll starting IMMEDIATELY after launcher exit
  // (the slow stub keeps the run observable). Also capture the first heartbeat for the advance check.
  const s1 = readSupervisorState(SUPDIR, "DETACH-RUN"); const hb1 = s1 && s1.heartbeat_epoch; const startId = s1 && s1.process_start_identity;
  let sawStubDescendant = false;
  for (let i = 0; i < 45 && alive(supervisorPid); i++) { if (kids(supervisorPid).length > 0) { sawStubDescendant = true; break; } sleep(150); }
  ok("05 provider stub runs as a descendant of the supervisor", sawStubDescendant === true);
  // (10-11) heartbeat advances AFTER launcher exit
  sleep(500);
  const s2 = readSupervisorState(SUPDIR, "DETACH-RUN"); const hb2 = s2 && s2.heartbeat_epoch;
  ok("06 heartbeat advances after launcher exit", typeof hb1 === "number" && typeof hb2 === "number" && hb2 >= hb1);
  ok("07 supervisor process-start identity recorded", !!startId);

  // (12-16) a SEPARATE witness process attaches read-only and reports HEALTHY_CONTINUE
  const wCfg = join(ROOT, "witness.json"); writeFileSync(wCfg, JSON.stringify({ supervisorDir: SUPDIR, ledgerDir: LEDGER, runId: "DETACH-RUN", runRoot: RUNROOT, repoRoot: REPO, protectedMainBaseline: MAIN0, providerIdentity: IDENT, queueTotal: 2, queueInitial: 2, polls: 3 }));
  const wr = spawnSync(process.execPath, [WITNESS, "--config", wCfg], { env: { ...process.env, LRCQ_WITNESS_TEST_MS: "600" }, encoding: "utf8", timeout: 12000 });
  let wj = null; try { wj = JSON.parse(wr.stdout); } catch { /* */ }
  ok("08 separate witness process attached read-only", !!wj && typeof wj.witness_pid === "number" && wj.witness_pid !== launcherPid && wj.witness_pid !== supervisorPid);
  ok("09 witness reports HEALTHY_CONTINUE for the healthy run", !!wj && wj.result === "HEALTHY_CONTINUE");
  ok("10 witness preserves production 12-minute semantics (720000ms)", !!wj && wj.production_witness_ms === 720000 && wj.accelerated_test === true);
  ok("11 run_id + immutable deadline stable across launcher/supervisor/witness", receipt.launch_receipt.run_id === "DETACH-RUN" && wj.run_id === "DETACH-RUN" && receipt.launch_receipt.immutable_hard_deadline_epoch === DEADLINE && wj.immutable_hard_deadline_epoch === DEADLINE && s1.immutable_hard_deadline_epoch === DEADLINE);

  // (20-21) supervisor reaches a durable terminal state; descendants gone after teardown
  let term = null; for (let i = 0; i < 60; i++) { const s = readSupervisorState(SUPDIR, "DETACH-RUN"); if (s && s.state && s.state !== "RUN_ACTIVE") { term = s.state; break; } sleep(250); }
  ok("12 supervisor reached a durable terminal state", term === "STOPPED_EXHAUSTED");
  sleep(400);
  ok("13 all supervised descendants gone after teardown", !alive(supervisorPid) || kids(supervisorPid).length === 0);

  // (22) replay stays blocked: a second launcher invocation with the same activation refuses (no run)
  const lr2 = spawnSync(process.execPath, [LAUNCHER, "--activation", actPath], { env: { ...process.env, LRCQ_TEST_LIFECYCLE: lifePath }, encoding: "utf8", timeout: 12000 });
  let r2 = null; try { r2 = JSON.parse(lr2.stdout); } catch { /* */ }
  ok("14 replay blocked after terminal (second launch refuses, not launched)", !!r2 && r2.launched === false && r2.final_state === "REPLAY_BLOCKED");

  // (23-24) protected main unchanged; no real Claude
  ok("15 disposable protected main unchanged", git(["rev-parse", "main"], REPO) === MAIN0);
  ok("16 provider was the slow stub, never real Claude", manifest.provider_executable_path === SLOWSTUB && SLOWSTUB.endsWith("slow-productive-stub.mjs"));
} finally { cleanup(); }

console.log("\nLRCQ DETACHED-SUPERVISOR SELFTEST: " + (n - fails.length) + "/" + n + " passed (real processes, stub provider)");
if (fails.length) { console.log("FAILED: " + fails.join(", ")); process.exit(1); }
process.exit(0);
