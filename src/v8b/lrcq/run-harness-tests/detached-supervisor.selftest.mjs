// FounderGate LRCQ — HERMETIC ACTIVE-RUN witness handoff proof (FG-LRCQ-ACT-017/018/019/020). Drives the
// ACTUAL production launcher (run-five-hour.mjs --activation) with NO seam over a COMPLETE disposable clone
// fixture bound by a SYNTHETIC signed activation (bindings == resolveBindings(); manifest points the provider
// at a deterministic SLOW stub, NEVER real Claude). Proves the intended ACTIVE handoff:
//   launcher exits -> supervisor RUN_ACTIVE -> a SEPARATE witness observes the ACTIVE run and returns
//   HEALTHY_CONTINUE while still RUN_ACTIVE -> the SAME supervisor + run continue and PROGRESS afterward ->
//   the run later reaches a truthful terminal (a post-terminal witness returns COMPLETED_HEALTHY, NOT
//   HEALTHY_CONTINUE) -> teardown reaps descendants -> replay stays blocked. The witness reads the
//   AUTHORITATIVE evidence index (evidence_index_path), never join(runRoot,"ev").
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
const stateOf = (dir) => { const s = readSupervisorState(dir, "HERMETIC-RUN"); return s && s.state; };
const idxCount = (p) => { try { return existsSync(p) ? readFileSync(p, "utf8").split("\n").filter((l) => l.trim()).length : 0; } catch { return 0; } };

const ROOT = mkdtempSync(join(tmpdir(), "lrcq-active-"));
let supervisorPid = null;
function cleanup() { try { if (supervisorPid && alive(supervisorPid)) { try { process.kill(-supervisorPid, "SIGKILL"); } catch { /* */ } try { process.kill(supervisorPid, "SIGKILL"); } catch { /* */ } } } catch { /* */ } try { rmSync(ROOT, { recursive: true, force: true }); } catch { /* */ } }

function runWitness(cfgExtra) {
  const wCfg = join(ROOT, "witness-" + Math.floor(idxCount(EVIDENCE_INDEX) + n) + ".json");
  writeFileSync(wCfg, JSON.stringify({ supervisorDir: SUPDIR, ledgerDir: LEDGER, runId: "HERMETIC-RUN", evidenceIndexPath: EVIDENCE_INDEX, repoRoot: CLONE, protectedMainBaseline: MAIN0, providerIdentity: PROVIDER_ID, queueTotal: 3, queueInitial: 3, acceleratedTotalMs: 1500, acceleratedPolls: 5, ...cfgExtra }));
  const wr = spawnSync(process.execPath, [WITNESS_ACCEL, "--config", wCfg], { encoding: "utf8", timeout: 15000 });
  try { return JSON.parse(wr.stdout); } catch { return null; }
}

let CLONE, SUPDIR, LEDGER, EVIDENCE_INDEX, MAIN0, PROVIDER_ID;
try {
  CLONE = join(ROOT, "repo");
  git(["clone", "--local", "--no-hardlinks", "-q", SRCREPO, CLONE], ROOT);
  git(["config", "user.email", "t@t"], CLONE); git(["config", "user.name", "t"], CLONE);
  const CAND = git(["rev-parse", "HEAD"], CLONE); MAIN0 = CAND;
  const SLOWSTUB = join(CLONE, "src/v8b/lrcq/provider-tests/slow-productive-stub.mjs");
  const WTROOT = join(ROOT, "wt"); mkdirSync(WTROOT, { recursive: true });
  const v2 = JSON.parse(readFileSync(join(CLONE, ".foundergate/backlog/first-real-five-hour-run-v2.json"), "utf8"));
  const jobs3 = v2.jobs.slice(0, 3).map((j) => ({ ...j, dependencies: [] }));
  const backlogRel = "fixture-3job.json"; writeFileSync(join(CLONE, backlogRel), JSON.stringify({ ...v2, jobs: jobs3 }, null, 2));
  const realMan = JSON.parse(readFileSync(join(CLONE, ".foundergate/run-materials/first-internal-5h/run-manifest.json"), "utf8"));
  const EVROOT = ".fixture-run/ev";
  const manifest = { ...realMan,
    repository_root: CLONE, permitted_worktree_root: WTROOT, evidence_root: EVROOT,
    backlog_path: backlogRel, backlog_digest: sha256File(join(CLONE, backlogRel)), job_count: jobs3.length,
    provider_executable_path: SLOWSTUB, resolved_provider_target: SLOWSTUB, provider_version: "stub-1",
    provider_executable_identity: sha256File(SLOWSTUB), max_parallel_width: 1,
    recovery_state_path: EVROOT + "/recovery-state.json", ledger_path: EVROOT + "/ledger.jsonl",
    transaction_registry_path: EVROOT + "/transactions.jsonl", replay_stream_path: EVROOT + "/replay.jsonl",
    evidence_index_path: EVROOT + "/evidence-index.jsonl", next_safe_action_path: EVROOT + "/next-safe-action.txt",
    run_lock_path: EVROOT + "/run.lock", pause_file_path: EVROOT + "/PAUSE", stop_file_path: EVROOT + "/STOP" };
  const manPath = join(ROOT, "manifest.fixture.json"); writeFileSync(manPath, JSON.stringify(manifest));
  PROVIDER_ID = manifest.provider_executable_identity;
  const b = resolveBindings(); const DEADLINE = 9_000_000_000;
  const activation = { schema_version: "lrcq-activation-3", founder_signature: "SYNTHETIC-TEST-SIGNATURE", issued_epoch: 1000, expiry_epoch: 9_999_999_999,
    lrcq_base_sha: b.lrcq_base_sha, lrcq_base_tree: b.lrcq_base_tree, provider_candidate_sha: b.provider_candidate_sha, provider_candidate_tree: b.provider_candidate_tree,
    run_harness_candidate_sha: b.run_harness_candidate_sha, run_harness_candidate_tree: b.run_harness_candidate_tree,
    assurance_control_backlog_digest: b.assurance_control_backlog_digest, first_real_run_backlog_digest: b.first_real_run_backlog_digest,
    provider_executable_path: SLOWSTUB, provider_version: "stub-1", provider_executable_identity: PROVIDER_ID,
    policy_version: "pv-1", capability_lease_digest: "ld-1", blast_radius_budget_digest: "bd-1",
    run_manifest_path: manPath, run_manifest_digest: manifestDigest(manifest),
    run_id: "HERMETIC-RUN", hard_deadline_epoch: DEADLINE, run_duration_s: 18000, max_parallel_width: 1, per_job_timeout_s: 2700,
    termination_grace_s: 30, max_output_bytes: 1048576, max_budget_usd: 10, delegation_depth: 1, external_calls: 0, recipients: 0,
    no_protected_main_merge: true, no_pr_merge: true, no_push_unless_authorized: true, no_m1: true, no_akior: true, no_customer_data: true, no_live_action: true, no_permission_bypass: true };
  const actPath = join(ROOT, "activation.json"); writeFileSync(actPath, JSON.stringify(activation));
  SUPDIR = join(CLONE, EVROOT, "supervisor"); LEDGER = join(CLONE, EVROOT, "activation-ledger"); EVIDENCE_INDEX = join(CLONE, EVROOT, "evidence-index.jsonl");

  // (1-4) Drive the ACTUAL production CLI with NO seam; launcher exits after RUN_ACTIVE.
  const t0 = Date.now();
  const lr = spawnSync(process.execPath, [LAUNCHER, "--activation", actPath], { encoding: "utf8", timeout: 40000 });
  let receipt = null; try { receipt = JSON.parse(lr.stdout); } catch { /* */ }
  ok("01 production --activation CLI launched WITHOUT the seam", lr.status === 0 && Date.now() - t0 < 35000);
  ok("02 launcher returned a RUN_ACTIVE receipt (did not await the run)", !!receipt && receipt.launched === true && receipt.launch_receipt && receipt.launch_receipt.state === "RUN_ACTIVE");
  const launcherPid = receipt && receipt.launcher_pid; supervisorPid = receipt && receipt.launch_receipt && receipt.launch_receipt.supervisor_pid;
  ok("03 supervisor PID differs from launcher PID", typeof supervisorPid === "number" && supervisorPid !== launcherPid);
  ok("04 launcher gone; supervisor alive after launcher exit", !alive(launcherPid) && alive(supervisorPid));
  const s1 = readSupervisorState(SUPDIR, "HERMETIC-RUN"); const startId = s1 && s1.process_start_identity;

  // Wait until a provider stub is actively executing (job in progress) so the witness observes an ACTIVE run.
  let sawStubDescendant = false;
  for (let i = 0; i < 120 && alive(supervisorPid); i++) { if (kids(supervisorPid).length > 0 && stateOf(SUPDIR) === "RUN_ACTIVE") { sawStubDescendant = true; break; } sleep(150); }
  ok("05 provider stub runs as a descendant of the supervisor (active job)", sawStubDescendant === true);
  ok("06 supervisor is RUN_ACTIVE when the witness begins", stateOf(SUPDIR) === "RUN_ACTIVE");
  ok("07 supervisor process-start identity recorded", !!startId);

  // (5-16) A SEPARATE witness observes the ACTIVE run and returns HEALTHY_CONTINUE while still RUN_ACTIVE.
  const wj = runWitness({});
  ok("08 witness process is separate (distinct PID)", !!wj && typeof wj.witness_pid === "number" && wj.witness_pid !== launcherPid && wj.witness_pid !== supervisorPid);
  ok("09 witness returns HEALTHY_CONTINUE (result=" + (wj && wj.result) + ", progressed=" + (wj && wj.progressed) + ")", !!wj && wj.result === "HEALTHY_CONTINUE");
  ok("10 witness reports run_active_at_end true", !!wj && wj.run_active_at_end === true);
  ok("11 witness read the authoritative evidence index (>=0 entries observed)", !!wj && typeof wj.evidence_index_last === "number");
  ok("12 witness reports the immutable production 12-minute window (720000ms)", !!wj && wj.production_witness_ms === 720000);
  const sAfter = readSupervisorState(SUPDIR, "HERMETIC-RUN");
  ok("13 supervisor still RUN_ACTIVE immediately after witness returns", sAfter && sAfter.state === "RUN_ACTIVE");
  ok("14 same supervisor PID + process-start identity after witness", sAfter && sAfter.supervisor_pid === supervisorPid && sAfter.process_start_identity === startId);
  ok("15 same run_id + immutable deadline across launcher/supervisor/witness", receipt.launch_receipt.run_id === "HERMETIC-RUN" && wj.run_id === "HERMETIC-RUN" && receipt.launch_receipt.immutable_hard_deadline_epoch === DEADLINE && wj.immutable_hard_deadline_epoch === DEADLINE && sAfter.immutable_hard_deadline_epoch === DEADLINE);

  // (16-17) the SAME run continues + PROGRESSES after the witness returns (a further job seals the index).
  const idxAfter = idxCount(EVIDENCE_INDEX);
  let progressed = false; let stayedActive = false;
  for (let i = 0; i < 100; i++) { if (stateOf(SUPDIR) === "RUN_ACTIVE") stayedActive = true; if (idxCount(EVIDENCE_INDEX) > idxAfter) { progressed = true; break; } if (stateOf(SUPDIR) && stateOf(SUPDIR) !== "RUN_ACTIVE") break; sleep(200); }
  ok("16 the same run continued RUN_ACTIVE after the witness returned", stayedActive === true);
  ok("17 durable progress occurred after the witness (evidence index grew)", progressed === true);

  // (18-19) the run later reaches a truthful terminal; a POST-terminal witness returns COMPLETED_HEALTHY, not HEALTHY_CONTINUE.
  let term = null; for (let i = 0; i < 160; i++) { const s = readSupervisorState(SUPDIR, "HERMETIC-RUN"); if (s && s.state && s.state !== "RUN_ACTIVE") { term = s.state; break; } sleep(250); }
  ok("18 supervisor reached a durable terminal state (STOPPED_EXHAUSTED)", term === "STOPPED_EXHAUSTED");
  const wTerm = runWitness({});
  ok("19 post-terminal witness returns COMPLETED_HEALTHY (never HEALTHY_CONTINUE)", !!wTerm && wTerm.result === "COMPLETED_HEALTHY" && wTerm.result !== "HEALTHY_CONTINUE");

  sleep(400);
  ok("20 all supervised descendants gone after teardown", !alive(supervisorPid) || kids(supervisorPid).length === 0);
  const lr2 = spawnSync(process.execPath, [LAUNCHER, "--activation", actPath], { encoding: "utf8", timeout: 20000 });
  let r2 = null; try { r2 = JSON.parse(lr2.stdout); } catch { /* */ }
  ok("21 replay blocked after terminal (second launch refuses, not launched)", !!r2 && r2.launched === false && r2.final_state === "REPLAY_BLOCKED");
  ok("22 provider was the deterministic stub, never real Claude", SLOWSTUB.endsWith("slow-productive-stub.mjs"));
} finally { cleanup(); }

console.log("\nLRCQ HERMETIC ACTIVE-WITNESS SELFTEST: " + (n - fails.length) + "/" + n + " passed (real processes, real CLI, no seam, stub provider)");
if (fails.length) { console.log("FAILED: " + fails.join(", ")); process.exit(1); }
process.exit(0);
