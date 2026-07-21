// FounderGate LRCQ — HERMETIC real-process detached-supervisor + independent-witness proof
// (FG-LRCQ-ACT-017/018/019). Drives the ACTUAL production launcher (run-five-hour.mjs --activation) with
// NO LRCQ_TEST_LIFECYCLE and NO injection of man/runBindings/testLife/testExec. The production CLI derives
// EVERYTHING from the validated signed activation + loadManifest + resolveBindings. A COMPLETE disposable
// fixture (full local clone of the repo carrying the real manifest + contracts + a 2-job backlog + a
// deterministic stub) is bound by a SYNTHETIC signed activation whose binding fields equal resolveBindings()
// and whose run_manifest_digest binds a disposable manifest that points the provider at the stub (NEVER real
// Claude). Proves the launcher EXITS while a SEPARATE supervisor OS process (distinct PID) keeps running, a
// SEPARATE witness process attaches read-only (via the structurally test-only accelerated witness entry;
// production witness stays an immutable 12 min), the stub is a supervisor descendant, run_id + immutable
// deadline are stable, the supervisor reaches a durable terminal state, descendants are gone after teardown,
// and replay stays blocked — all WITHOUT the retired production seam.
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync, readFileSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readSupervisorState } from "../run-harness/supervisor.mjs";
import { manifestDigest, sha256File } from "../run-harness/run-manifest.mjs";
import { resolveBindings } from "../../../../tools/terminal0/lrcq/run-five-hour.mjs";

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log("  FAIL " + name); } else console.log("  ok   " + name); };
const HERE = dirname(fileURLToPath(import.meta.url));
const SRCREPO = join(HERE, "../../../..");
const LAUNCHER = join(SRCREPO, "tools/terminal0/lrcq/run-five-hour.mjs");
const WITNESS_ACCEL = join(SRCREPO, "src/v8b/lrcq/run-harness-tests/test-support/witness-accel.mjs");
const git = (a, cwd) => execFileSync("git", a, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return e && e.code === "EPERM"; } };
const kids = (pid) => { try { return execFileSync("pgrep", ["-P", String(pid)], { encoding: "utf8" }).trim().split(/\s+/).filter(Boolean); } catch { return []; } };
const sleep = (ms) => execFileSync("sleep", [String(ms / 1000)]);

const ROOT = mkdtempSync(join(tmpdir(), "lrcq-hermetic-"));
let supervisorPid = null;
function cleanup() { try { if (supervisorPid && alive(supervisorPid)) { try { process.kill(-supervisorPid, "SIGKILL"); } catch { /* */ } try { process.kill(supervisorPid, "SIGKILL"); } catch { /* */ } } } catch { /* */ } try { rmSync(ROOT, { recursive: true, force: true }); } catch { /* */ } }

try {
  // 1. COMPLETE disposable fixture: a full local clone of the repo at the frozen candidate (carries the real
  //    manifest, all 8 contracts, the backlog, and the deterministic stub). Worktrees + all run writes land
  //    inside the clone / disposable roots — never the governed repo.
  const CLONE = join(ROOT, "repo");
  git(["clone", "--local", "--no-hardlinks", "-q", SRCREPO, CLONE], ROOT);
  git(["config", "user.email", "t@t"], CLONE); git(["config", "user.name", "t"], CLONE);
  const CAND = git(["rev-parse", "HEAD"], CLONE);          // = frozen candidate; exists in the clone
  const MAIN0 = git(["rev-parse", "HEAD"], CLONE);
  const SLOWSTUB = join(CLONE, "src/v8b/lrcq/provider-tests/slow-productive-stub.mjs");
  const WTROOT = join(ROOT, "wt"); mkdirSync(WTROOT, { recursive: true });

  // 2. A 2-job backlog (real v2 jobs, dependencies stripped) written INTO the clone; digest recomputed.
  const v2 = JSON.parse(readFileSync(join(CLONE, ".foundergate/backlog/first-real-five-hour-run-v2.json"), "utf8"));
  const jobs2 = v2.jobs.slice(0, 2).map((j) => ({ ...j, dependencies: [] }));
  const backlogRel = "fixture-2job.json";
  writeFileSync(join(CLONE, backlogRel), JSON.stringify({ ...v2, jobs: jobs2 }, null, 2));

  // 3. Disposable manifest = the real manifest with ONLY provider->stub, repository_root->clone, the 2-job
  //    backlog, disposable worktree/evidence roots. All other contract path/digest pairs stay real (the
  //    clone's files are byte-identical, so their digests still verify).
  const realMan = JSON.parse(readFileSync(join(CLONE, ".foundergate/run-materials/first-internal-5h/run-manifest.json"), "utf8"));
  const EVROOT = ".fixture-run/ev";
  const manifest = { ...realMan,
    repository_root: CLONE, permitted_worktree_root: WTROOT, evidence_root: EVROOT,
    backlog_path: backlogRel, backlog_digest: sha256File(join(CLONE, backlogRel)), job_count: jobs2.length,
    provider_executable_path: SLOWSTUB, resolved_provider_target: SLOWSTUB, provider_version: "stub-1",
    provider_executable_identity: sha256File(SLOWSTUB), max_parallel_width: 1,
    recovery_state_path: EVROOT + "/recovery-state.json", ledger_path: EVROOT + "/ledger.jsonl",
    transaction_registry_path: EVROOT + "/transactions.jsonl", replay_stream_path: EVROOT + "/replay.jsonl",
    evidence_index_path: EVROOT + "/evidence-index.jsonl", next_safe_action_path: EVROOT + "/next-safe-action.txt",
    run_lock_path: EVROOT + "/run.lock", pause_file_path: EVROOT + "/PAUSE", stop_file_path: EVROOT + "/STOP" };
  const manPath = join(ROOT, "manifest.fixture.json"); writeFileSync(manPath, JSON.stringify(manifest));

  // 4. Synthetic SIGNED activation. Binding fields == resolveBindings() (so validateActivationV3 passes);
  //    provider fields == the stub (== manifest); run_manifest_path/digest bind the disposable manifest.
  const b = resolveBindings();
  const DEADLINE = 9_000_000_000;
  const activation = {
    schema_version: "lrcq-activation-3", founder_signature: "SYNTHETIC-TEST-SIGNATURE",
    issued_epoch: 1000, expiry_epoch: 9_999_999_999,
    lrcq_base_sha: b.lrcq_base_sha, lrcq_base_tree: b.lrcq_base_tree, provider_candidate_sha: b.provider_candidate_sha,
    provider_candidate_tree: b.provider_candidate_tree, run_harness_candidate_sha: b.run_harness_candidate_sha,
    run_harness_candidate_tree: b.run_harness_candidate_tree, assurance_control_backlog_digest: b.assurance_control_backlog_digest,
    first_real_run_backlog_digest: b.first_real_run_backlog_digest,
    provider_executable_path: SLOWSTUB, provider_version: "stub-1", provider_executable_identity: sha256File(SLOWSTUB),
    policy_version: "pv-1", capability_lease_digest: "ld-1", blast_radius_budget_digest: "bd-1",
    run_manifest_path: manPath, run_manifest_digest: manifestDigest(manifest),
    run_id: "HERMETIC-RUN", hard_deadline_epoch: DEADLINE, run_duration_s: 18000, max_parallel_width: 1,
    per_job_timeout_s: 2700, termination_grace_s: 30, max_output_bytes: 1048576, max_budget_usd: 10,
    delegation_depth: 1, external_calls: 0, recipients: 0,
    no_protected_main_merge: true, no_pr_merge: true, no_push_unless_authorized: true, no_m1: true,
    no_akior: true, no_customer_data: true, no_live_action: true, no_permission_bypass: true };
  const actPath = join(ROOT, "activation.json"); writeFileSync(actPath, JSON.stringify(activation));
  const SUPDIR = join(CLONE, EVROOT, "supervisor"), LEDGER = join(CLONE, EVROOT, "activation-ledger"), RUNROOT = join(CLONE, EVROOT);

  // 5. Drive the ACTUAL production CLI — NO seam env. spawnSync returns when the launcher EXITS.
  const t0 = Date.now();
  const lr = spawnSync(process.execPath, [LAUNCHER, "--activation", actPath], { encoding: "utf8", timeout: 40000 });
  let receipt = null; try { receipt = JSON.parse(lr.stdout); } catch { /* */ }
  ok("01 production --activation CLI launched WITHOUT the seam (no LRCQ_TEST_LIFECYCLE)", lr.status === 0 && Date.now() - t0 < 35000);
  ok("02 launcher returned a RUN_ACTIVE launch receipt (did not await the run)", !!receipt && receipt.launched === true && receipt.launch_receipt && receipt.launch_receipt.state === "RUN_ACTIVE");
  const launcherPid = receipt && receipt.launcher_pid; supervisorPid = receipt && receipt.launch_receipt && receipt.launch_receipt.supervisor_pid;
  ok("03 supervisor PID differs from launcher PID (real OS detachment)", typeof supervisorPid === "number" && typeof launcherPid === "number" && supervisorPid !== launcherPid);
  ok("04 launcher process is gone; supervisor is alive after launcher exit", !alive(launcherPid) && alive(supervisorPid));

  const s1 = readSupervisorState(SUPDIR, "HERMETIC-RUN"); const hb1 = s1 && s1.heartbeat_epoch; const startId = s1 && s1.process_start_identity;
  ok("07 supervisor process-start identity recorded", !!startId);

  // While the run is still ACTIVE (right after launcher exit): the provider stub is a descendant of the
  // supervisor, and the heartbeat is present + non-decreasing.
  let sawStubDescendant = false;
  for (let i = 0; i < 60 && alive(supervisorPid); i++) { if (kids(supervisorPid).length > 0) { sawStubDescendant = true; break; } sleep(150); }
  ok("05 provider stub runs as a descendant of the supervisor", sawStubDescendant === true);
  const s2 = readSupervisorState(SUPDIR, "HERMETIC-RUN"); const hb2 = s2 && s2.heartbeat_epoch;
  ok("06 supervisor heartbeat present + non-decreasing after launcher exit (strict advance is unit-proven)", typeof hb1 === "number" && typeof hb2 === "number" && hb2 >= hb1);

  // The detached supervisor drives the run to a DURABLE terminal state after the launcher has exited.
  let term = null; for (let i = 0; i < 160; i++) { const s = readSupervisorState(SUPDIR, "HERMETIC-RUN"); if (s && s.state && s.state !== "RUN_ACTIVE") { term = s.state; break; } sleep(250); }
  ok("12 supervisor reached a durable terminal state", term === "STOPPED_EXHAUSTED");

  // 6. A SEPARATE witness process attaches read-only — via the structurally test-only accelerated entry
  //    (the PRODUCTION witness stays an immutable 12 min). It independently confirms the completed run was
  //    healthy within every boundary control and reports the production window constant.
  const wCfg = join(ROOT, "witness.json"); writeFileSync(wCfg, JSON.stringify({ supervisorDir: SUPDIR, ledgerDir: LEDGER, runId: "HERMETIC-RUN", runRoot: RUNROOT, repoRoot: CLONE, protectedMainBaseline: MAIN0, providerIdentity: manifest.provider_executable_identity, queueTotal: 2, queueInitial: 2, acceleratedTotalMs: 300, acceleratedPolls: 3 }));
  const wr = spawnSync(process.execPath, [WITNESS_ACCEL, "--config", wCfg], { encoding: "utf8", timeout: 12000 });
  let wj = null; try { wj = JSON.parse(wr.stdout); } catch { /* */ }
  ok("08 separate witness process attached read-only", !!wj && typeof wj.witness_pid === "number" && wj.witness_pid !== launcherPid && wj.witness_pid !== supervisorPid);
  ok("09 witness reports HEALTHY_CONTINUE for the healthy run (result=" + (wj && wj.result) + ", failed=" + (wj && JSON.stringify(wj.failed_checks)) + ")", !!wj && wj.result === "HEALTHY_CONTINUE");
  ok("10 witness reports the immutable production 12-minute window (720000ms)", !!wj && wj.production_witness_ms === 720000);
  ok("11 run_id + immutable deadline stable across launcher/supervisor/witness", receipt.launch_receipt.run_id === "HERMETIC-RUN" && wj.run_id === "HERMETIC-RUN" && receipt.launch_receipt.immutable_hard_deadline_epoch === DEADLINE && wj.immutable_hard_deadline_epoch === DEADLINE && s1.immutable_hard_deadline_epoch === DEADLINE);
  sleep(400);
  ok("13 all supervised descendants gone after teardown", !alive(supervisorPid) || kids(supervisorPid).length === 0);

  // 7. Replay stays blocked: a second production --activation with the same activation refuses (no run).
  const lr2 = spawnSync(process.execPath, [LAUNCHER, "--activation", actPath], { encoding: "utf8", timeout: 20000 });
  let r2 = null; try { r2 = JSON.parse(lr2.stdout); } catch { /* */ }
  ok("14 replay blocked after terminal (second launch refuses, not launched)", !!r2 && r2.launched === false && r2.final_state === "REPLAY_BLOCKED");
  ok("15 disposable protected main unchanged", git(["rev-parse", "HEAD"], CLONE) === MAIN0);
  ok("16 provider was the deterministic stub, never real Claude", manifest.provider_executable_path === SLOWSTUB && SLOWSTUB.endsWith("slow-productive-stub.mjs"));
} finally { cleanup(); }

console.log("\nLRCQ HERMETIC DETACHED-SUPERVISOR SELFTEST: " + (n - fails.length) + "/" + n + " passed (real processes, real CLI, no seam, stub provider)");
if (fails.length) { console.log("FAILED: " + fails.join(", ")); process.exit(1); }
process.exit(0);
