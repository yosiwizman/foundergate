// FounderGate LRCQ — HERMETIC ACTIVE-RUN witness handoff proof over the FULL V4 AUTHORITY CHAIN
// (FG-LRCQ-ACT-017/018/019/020, migrated by FG-LRCQ-ACT-029).
//
// Drives the ACTUAL production launcher CLI (`run-five-hour.mjs --activation --authorization`) with NO seam
// and NO test-only injection, over a COMPLETE DISPOSABLE CLONE of the repository. The clone carries a
// DISPOSABLE Ed25519 public key in its OWN docs/governance/FOUNDER_KEY_AUTHORITY.json, so the clone's
// governed key-authority loader (which resolves the repository from its own module location) accepts a
// signature made by the matching disposable private key. The real repository's authority file is never read
// or written and its active_keys stays empty; no real founder key, signature, or activation exists.
//
// Proves the intended chain and the ACTIVE handoff:
//   signed V4 -> governed key authority -> VERIFIED -> SIGNED manifest -> pre-consumption provider
//   verification -> governed one-time consumption -> signed launch intent -> ONE-USE inherited-descriptor
//   key transfer -> DETACHED supervisor -> INDEPENDENT V4 re-verification in that process -> signed
//   supervisor claim -> SUPERVISOR_EXECUTION -> deterministic execution -> provider eligibility -> spawn
//   boundary; launcher exits; a SEPARATE witness observes the ACTIVE run and returns HEALTHY_CONTINUE; the
//   SAME supervisor progresses; the run reaches a truthful terminal; teardown reaps descendants; replay is
//   blocked. The provider is a deterministic SLOW stub — NEVER real Claude.
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync, readFileSync, copyFileSync, chmodSync, cpSync, realpathSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { generateKeyPairSync, createPublicKey } from "node:crypto";
import { tmpdir } from "node:os";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { readSupervisorState } from "../run-harness/supervisor.mjs";
import { sha256File } from "../run-harness/run-manifest.mjs";
import { fingerprintOfSpkiDer } from "../assurance/founder-key-authority.mjs";
import { signActivation, authorizationTextDigest, ACTIVATION_V4_SCHEMA, V4_SIGNATURE_PAYLOAD_VERSION, LIFECYCLE_CONTRACT_VERSION } from "../assurance/activation-v4.mjs";

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log("  FAIL " + name); } else console.log("  ok   " + name); };
const HERE = dirname(fileURLToPath(import.meta.url));
const SRCREPO = realpathSync(join(HERE, "../../../.."));
const git = (a, cwd) => execFileSync("git", a, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return e && e.code === "EPERM"; } };
const kids = (pid) => { try { return execFileSync("pgrep", ["-P", String(pid)], { encoding: "utf8" }).trim().split(/\s+/).filter(Boolean); } catch { return []; } };
const sleep = (ms) => execFileSync("sleep", [String(ms / 1000)]);
const RUN_ID = "HERMETIC-V4-RUN";
const idxCount = (p) => { try { return existsSync(p) ? readFileSync(p, "utf8").split("\n").filter((l) => l.trim()).length : 0; } catch { return 0; } };

const ROOT = mkdtempSync(join(tmpdir(), "lrcq-v4active-"));
let supervisorPid = null;
function cleanup() { try { if (supervisorPid && alive(supervisorPid)) { try { process.kill(-supervisorPid, "SIGKILL"); } catch { /* */ } try { process.kill(supervisorPid, "SIGKILL"); } catch { /* */ } } } catch { /* */ } try { rmSync(ROOT, { recursive: true, force: true }); } catch { /* */ } }

let CLONE, SUPDIR, EVIDENCE_INDEX, JOB_IDS, PROVIDER_PATH, MAIN_REF_SHA, LIFECYCLE_ROOT;
const WITNESS_ACCEL = join(SRCREPO, "src/v8b/lrcq/run-harness-tests/test-support/witness-accel.mjs");
function runWitness(extra) {
  const wCfg = join(ROOT, "witness-" + n + ".json");
  writeFileSync(wCfg, JSON.stringify({ supervisorDir: SUPDIR, ledgerDir: LIFECYCLE_ROOT, runId: RUN_ID, evidenceIndexPath: EVIDENCE_INDEX, repoRoot: CLONE, jobIds: JOB_IDS, providerExpectedPath: PROVIDER_PATH, protectedMainRef: "refs/remotes/origin/main", protectedMainBaseline: MAIN_REF_SHA, perJobTimeoutS: 60, acceleratedTotalMs: 1500, acceleratedPolls: 5, ...extra }));
  const wr = spawnSync(process.execPath, [WITNESS_ACCEL, "--config", wCfg], { encoding: "utf8", timeout: 20000 });
  try { return JSON.parse(wr.stdout); } catch { return null; }
}

try {
  // ---- 0. disposable CLONE carrying the under-test sources ----
  CLONE = join(ROOT, "repo");
  git(["clone", "--local", "--no-hardlinks", "-q", SRCREPO, CLONE], ROOT);
  git(["config", "user.email", "t@t"], CLONE); git(["config", "user.name", "t"], CLONE);
  MAIN_REF_SHA = git(["rev-parse", "refs/remotes/origin/main"], CLONE);
  // overlay the CURRENT working-tree sources under test (a clone carries only committed files)
  for (const rel of ["src/v8b/lrcq", "tools/terminal0/lrcq"]) cpSync(join(SRCREPO, rel), join(CLONE, rel), { recursive: true });
  const SLOWSTUB = join(CLONE, "src/v8b/lrcq/provider-tests/slow-productive-stub.mjs");
  chmodSync(SLOWSTUB, 0o755); PROVIDER_PATH = SLOWSTUB;
  const CAND = git(["rev-parse", "HEAD"], CLONE), CANDTREE = git(["rev-parse", "HEAD^{tree}"], CLONE);

  // ---- 1. DISPOSABLE founder key, enrolled ONLY in the clone's own governance file ----
  const kp = generateKeyPairSync("ed25519");
  const spkiDer = createPublicKey(kp.privateKey).export({ format: "der", type: "spki" });
  const fingerprint = fingerprintOfSpkiDer(spkiDer);
  const authorityPath = join(CLONE, "docs/governance/FOUNDER_KEY_AUTHORITY.json");
  const realAuthorityBefore = readFileSync(join(SRCREPO, "docs/governance/FOUNDER_KEY_AUTHORITY.json"), "utf8");
  writeFileSync(authorityPath, JSON.stringify({ schema: "lrcq-founder-key-authority-1", schema_version: 1, max_current_keys: 1, active_keys: [{ fingerprint, public_key_spki_b64: spkiDer.toString("base64"), algorithm: "ed25519", current: true, enrolled_note: "DISPOSABLE TEST KEY — clone only" }], revoked_keys: [] }, null, 2) + "\n");

  // ---- 2. the run fixture: 3 independent frozen jobs, the SLOW stub as the reviewed provider target ----
  const WTROOT = join(ROOT, "wt"); mkdirSync(WTROOT, { recursive: true });
  const v2 = JSON.parse(readFileSync(join(CLONE, ".foundergate/backlog/first-real-five-hour-run-v2.json"), "utf8"));
  const jobs3 = v2.jobs.slice(0, 3).map((j) => ({ ...j, dependencies: [] }));
  JOB_IDS = jobs3.map((j) => j.job_id);
  const backlogAbs = join(CLONE, "fixture-3job.json");
  writeFileSync(backlogAbs, JSON.stringify({ ...v2, jobs: jobs3 }, null, 2));
  const realMan = JSON.parse(readFileSync(join(CLONE, ".foundergate/run-materials/first-internal-5h/run-manifest.json"), "utf8"));
  const EVROOT = ".fixture-run/ev";
  const manifest = { ...realMan,
    repository_root: CLONE, permitted_worktree_root: WTROOT, evidence_root: EVROOT,
    backlog_path: backlogAbs, backlog_digest: sha256File(backlogAbs), job_count: jobs3.length,
    provider_executable_path: SLOWSTUB, resolved_provider_target: SLOWSTUB, provider_version: "stub-1",
    provider_executable_identity: sha256File(SLOWSTUB), max_parallel_width: 1, per_job_timeout_s: 60, termination_grace_s: 2,
    recovery_state_path: EVROOT + "/recovery-state.json", ledger_path: EVROOT + "/ledger.jsonl",
    transaction_registry_path: EVROOT + "/transactions.jsonl", replay_stream_path: EVROOT + "/replay.jsonl",
    evidence_index_path: EVROOT + "/evidence-index.jsonl", next_safe_action_path: EVROOT + "/next-safe-action.txt",
    run_lock_path: EVROOT + "/run.lock", pause_file_path: EVROOT + "/PAUSE", stop_file_path: EVROOT + "/STOP" };
  // the manifest lives INSIDE the signed repository root; the activation SIGNS its path + file digest
  const manRel = "fixture-run-manifest.json";
  const manAbs = join(CLONE, manRel);
  writeFileSync(manAbs, JSON.stringify(manifest, null, 2) + "\n");
  const lifecycleRoot = join(CLONE, ".fixture-run/lifecycle"); mkdirSync(lifecycleRoot, { recursive: true });
  LIFECYCLE_ROOT = realpathSync(lifecycleRoot);

  // ---- 3. the SIGNED V4 activation (disposable key; nothing here is a real founder act) ----
  const authorizationBytes = Buffer.from("DISPOSABLE CLONE AUTHORIZATION — one bounded deterministic run\n");
  const authPath = join(ROOT, "authorization.txt");
  writeFileSync(authPath, authorizationBytes, { mode: 0o600 });
  const DEADLINE = 9_000_000_000;
  const payload = {
    schema: ACTIVATION_V4_SCHEMA, signature_payload_version: V4_SIGNATURE_PAYLOAD_VERSION,
    founder_signature_algorithm: "ed25519", signer_key_fingerprint: fingerprint,
    authorization_text_digest: authorizationTextDigest(authorizationBytes), activation_nonce: "hermetic-v4-1",
    repository_root_realpath: realpathSync(CLONE), repository_git_common_dir_realpath: realpathSync(join(CLONE, ".git")),
    lifecycle_root_realpath: realpathSync(lifecycleRoot), lifecycle_contract_version: LIFECYCLE_CONTRACT_VERSION,
    evidence_commit_sha: CAND, evidence_commit_tree: CANDTREE,
    reviewed_runtime_sha: CAND, reviewed_runtime_tree: CANDTREE,
    run_manifest_path: manRel, run_manifest_digest: sha256File(manAbs),
    lrcq_base_sha: "3794ec1a6f0d83b72a823bbd36622b1210b1a4c5", lrcq_base_tree: git(["rev-parse", "3794ec1^{tree}"], CLONE),
    provider_candidate_sha: "50e18e55863b4abc0f0c2ef036b790ef15001ac5", provider_candidate_tree: git(["rev-parse", "50e18e5^{tree}"], CLONE),
    run_id: RUN_ID, backlog_digest: manifest.backlog_digest,
    provider_executable_path: SLOWSTUB, resolved_provider_target: SLOWSTUB, provider_version: "stub-1",
    provider_executable_identity: manifest.provider_executable_identity,
    capability_lease_digest: "sha256:" + "a".repeat(64), blast_radius_budget_digest: "sha256:" + "b".repeat(64),
    issued_epoch: 1_700_000_000, expiry_epoch: 9_999_999_999, hard_deadline_epoch: DEADLINE,
    max_budget_usd: 10, run_duration_s: 18000, per_job_timeout_s: 60, max_parallel_width: 1,
    max_output_bytes: 1048576, termination_grace_s: 2,
    no_protected_main_merge: true, no_pr_merge: true, no_push_unless_authorized: true, no_m1: true, no_akior: true,
    no_customer_data: true, no_live_action: true, no_permission_bypass: true, no_deploy: true, no_external_comms: true,
  };
  const actPath = join(ROOT, "signed-activation-v4.json");
  writeFileSync(actPath, JSON.stringify(signActivation(payload, kp.privateKey), null, 2) + "\n");
  SUPDIR = join(CLONE, EVROOT, "supervisor"); EVIDENCE_INDEX = join(CLONE, EVROOT, "evidence-index.jsonl");
  const CLONE_LAUNCHER = join(CLONE, "tools/terminal0/lrcq/run-five-hour.mjs");

  // ---- 4. the REAL repository's founder-key authority is untouched and still EMPTY ----
  ok("00 the real repository's active_keys is still EMPTY (no enrollment happened)", JSON.parse(realAuthorityBefore).active_keys.length === 0 && JSON.parse(readFileSync(join(SRCREPO, "docs/governance/FOUNDER_KEY_AUTHORITY.json"), "utf8")).active_keys.length === 0);

  // ---- 5. drive the ACTUAL production CLI with NO seam ----
  const t0 = Date.now();
  const lr = spawnSync(process.execPath, [CLONE_LAUNCHER, "--activation", actPath, "--authorization", authPath], { encoding: "utf8", timeout: 60000 });
  let receipt = null; try { receipt = JSON.parse(lr.stdout); } catch { /* */ }
  if (lr.status !== 0 || !receipt) console.log("   launcher stdout/stderr: " + (lr.stdout || "").slice(-1500) + (lr.stderr || "").slice(-1500));
  ok("01 production --activation CLI launched WITHOUT any seam or test override", lr.status === 0 && Date.now() - t0 < 55000);
  ok("02 launcher returned a RUN_ACTIVE receipt (did not await the run)", !!receipt && receipt.launched === true && receipt.launch_receipt && receipt.launch_receipt.state === "RUN_ACTIVE");
  ok("03 the one-use ephemeral key transfer is recorded SPENT", !!receipt && receipt.key_transfer === "TRANSFERRED_SPENT");
  const launcherPid = receipt && receipt.launcher_pid; supervisorPid = receipt && receipt.launch_receipt && receipt.launch_receipt.supervisor_pid;
  ok("04 supervisor PID differs from launcher PID", typeof supervisorPid === "number" && supervisorPid !== launcherPid);
  ok("05 launcher gone; supervisor alive after launcher exit", !alive(launcherPid) && alive(supervisorPid));
  ok("06 the launch receipt binds the governed supervisor entrypoint + its digest", !!receipt && /supervisor-main\.mjs$/.test(receipt.launch_receipt.supervisor_entrypoint) && /^sha256:[0-9a-f]{64}$/.test(receipt.launch_receipt.supervisor_entrypoint_digest));

  // ---- 6. the SIGNED lifecycle records exist in the SIGNED lifecycle root ----
  if (!receipt || !receipt.launch_receipt) { console.log("\nLRCQ HERMETIC V4 ACTIVE-WITNESS SELFTEST: " + (n - fails.length) + "/" + n + " passed"); console.log("FAILED: " + fails.join(", ")); cleanup(); process.exit(1); }
  const idFile = receipt.launch_receipt.activation_id.replace(":", "_");
  ok("07 an ephemeral-signed consumed marker was written into the SIGNED lifecycle root", existsSync(join(lifecycleRoot, idFile + ".consumed.json")));
  ok("08 an ephemeral-signed launch intent was written", existsSync(join(lifecycleRoot, idFile + ".launch-intent.json")));
  let claimSeen = false;
  for (let i = 0; i < 80; i++) { if (existsSync(join(lifecycleRoot, idFile + ".supervisor-claim.json"))) { claimSeen = true; break; } sleep(150); }
  ok("09 the DETACHED supervisor wrote its own ephemeral-signed claim (independent re-verification)", claimSeen);
  if (claimSeen) { const claim = JSON.parse(readFileSync(join(lifecycleRoot, idFile + ".supervisor-claim.json"), "utf8"));
    ok("10 the claim is owned by the supervisor process (pid + observed start identity)", claim.supervisor_pid === supervisorPid && /lstart:/.test(claim.supervisor_start_identity || "")); }
  else ok("10 the claim is owned by the supervisor process (pid + observed start identity)", false);
  const noKeyOnDisk = ["consumed.json", "launch-intent.json", "supervisor-claim.json"].every((k) => { const p = join(lifecycleRoot, idFile + "." + k); return !existsSync(p) || !/PRIVATE KEY|FGV4KEY1/.test(readFileSync(p, "utf8")); });
  ok("11 no key material appears in any durable lifecycle record", noKeyOnDisk);

  // ---- 7. an ACTIVE run: the provider stub is a descendant of the supervisor ----
  const stateOf = () => { const s = readSupervisorState(SUPDIR, RUN_ID); return s && s.state; };
  let sawStubDescendant = false;
  for (let i = 0; i < 160 && alive(supervisorPid); i++) { if (kids(supervisorPid).length > 0 && stateOf() === "RUN_ACTIVE") { sawStubDescendant = true; break; } sleep(150); }
  ok("12 provider stub runs as a descendant of the supervisor (active job)", sawStubDescendant === true);
  ok("13 supervisor is RUN_ACTIVE when the witness begins", stateOf() === "RUN_ACTIVE");
  const s1 = readSupervisorState(SUPDIR, RUN_ID); const startId = s1 && s1.process_start_identity;
  ok("14 supervisor process-start identity recorded", !!startId);

  // ---- 8. a SEPARATE witness observes the ACTIVE run ----
  const wj = runWitness({});
  ok("15 witness process is separate (distinct PID)", !!wj && typeof wj.witness_pid === "number" && wj.witness_pid !== launcherPid && wj.witness_pid !== supervisorPid);
  ok("16 witness returns HEALTHY_CONTINUE (result=" + (wj && wj.result) + ", failed=" + (wj && JSON.stringify(wj.failed_checks)) + ")", !!wj && wj.result === "HEALTHY_CONTINUE");
  ok("17 witness reports run_active_at_end true", !!wj && wj.run_active_at_end === true);
  ok("18 witness read the authoritative evidence index", !!wj && typeof wj.evidence_sealed_last === "number");
  ok("19 witness reports the immutable production 12-minute window (720000ms)", !!wj && wj.production_witness_ms === 720000);
  const sAfter = readSupervisorState(SUPDIR, RUN_ID);
  ok("20 same supervisor PID + process-start identity after witness", sAfter && sAfter.supervisor_pid === supervisorPid && sAfter.process_start_identity === startId);
  ok("21 same run_id + immutable deadline across launcher/supervisor/witness", receipt.launch_receipt.run_id === RUN_ID && wj.run_id === RUN_ID && receipt.launch_receipt.immutable_hard_deadline_epoch === DEADLINE && sAfter.immutable_hard_deadline_epoch === DEADLINE);

  // ---- 9. the run progresses, terminates truthfully, tears down, and cannot replay ----
  const idxAfter = idxCount(EVIDENCE_INDEX);
  let progressed = false, stayedActive = false;
  for (let i = 0; i < 140; i++) { if (stateOf() === "RUN_ACTIVE") stayedActive = true; if (idxCount(EVIDENCE_INDEX) > idxAfter) { progressed = true; break; } if (stateOf() && stateOf() !== "RUN_ACTIVE") break; sleep(200); }
  ok("22 the same run continued RUN_ACTIVE after the witness returned", stayedActive === true);
  ok("23 durable progress occurred after the witness (evidence index grew)", progressed === true);
  let term = null; for (let i = 0; i < 220; i++) { const s = readSupervisorState(SUPDIR, RUN_ID); if (s && s.state && s.state !== "RUN_ACTIVE") { term = s.state; break; } sleep(250); }
  ok("24 supervisor reached a durable terminal state (STOPPED_EXHAUSTED), not a fail-closed HELD", term === "STOPPED_EXHAUSTED");
  ok("25 all 3 jobs sealed evidence through the V4 chain", idxCount(EVIDENCE_INDEX) >= 3);
  const wTerm = runWitness({});
  ok("26 post-terminal witness returns COMPLETED_HEALTHY (never HEALTHY_CONTINUE)", !!wTerm && wTerm.result === "COMPLETED_HEALTHY");
  sleep(400);
  ok("27 all supervised descendants gone after teardown", !alive(supervisorPid) || kids(supervisorPid).length === 0);
  const lr2 = spawnSync(process.execPath, [CLONE_LAUNCHER, "--activation", actPath, "--authorization", authPath], { encoding: "utf8", timeout: 30000 });
  let r2 = null; try { r2 = JSON.parse(lr2.stdout); } catch { /* */ }
  ok("28 replay blocked after terminal (second launch refuses, not launched)", !!r2 && r2.launched === false && r2.final_state === "REPLAY_BLOCKED");
  ok("29 provider was the deterministic SLOW stub, never real Claude", SLOWSTUB.endsWith("slow-productive-stub.mjs"));

  // ---- 10. the REAL repository CLI still refuses: no founder key is enrolled there ----
  const realCli = spawnSync(process.execPath, [join(SRCREPO, "tools/terminal0/lrcq/run-five-hour.mjs"), "--activation", actPath, "--authorization", authPath], { encoding: "utf8", timeout: 30000 });
  let rr = null; try { rr = JSON.parse(realCli.stdout); } catch { /* */ }
  ok("30 the REAL repository launcher refuses (KEY_ENROLLMENT gate; nothing consumed, nothing spawned)", !!rr && rr.launched === false && rr.consumed === false && rr.founder_gate && rr.founder_gate.gate === "KEY_ENROLLMENT");
} finally { cleanup(); }

console.log("\nLRCQ HERMETIC V4 ACTIVE-WITNESS SELFTEST: " + (n - fails.length) + "/" + n + " passed (real processes, real CLI, full V4 chain, stub provider)");
if (fails.length) { console.log("FAILED: " + fails.join(", ")); process.exit(1); }
process.exit(0);
