// FounderGate LRCQ — real provider route test matrix (HARDENED; deterministic stubs; NO Claude call).
// FG-LRCQ-ACT-029: the provider SPAWN BOUNDARY now requires a genuine SUPERVISOR_EXECUTION capability, which
// is mintable only inside a process that received the per-activation ephemeral key over the governed
// inherited anonymous descriptor. So this file splits in two:
//   * IN-PROCESS — pure schema/argv/env/git-identity/controller checks plus the V4 boundary NEGATIVES
//     (no capability here, so every spawn attempt must be refused with zero side effects);
//   * UNDER A GENUINE CAPABILITY — the process/outcome/containment matrix, executed by
//     test-support/bodies/real-provider-exec.body.mjs inside the governed execution child, using the
//     production NON-AUTHORITATIVE projection of that capability (never a hand-written V2 record).
import { runJob, buildArgv, scrubEnv, gitWorktreeIdentity } from "../provider/real-provider.mjs";
import { validateActivation, denyListSemanticGaps, ACTIVATION_SCHEMA_VERSION } from "../provider/activation-schema.mjs";
import { Controller, MODE } from "../controller.mjs";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, realpathSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runV4Body, reportChecks } from "../run-harness-tests/test-support/v4-run-body.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const STUB = realpathSync(join(HERE, "claude-stub.mjs"));
const BODY = join(HERE, "../run-harness-tests/test-support/bodies/real-provider-exec.body.mjs");
const ROOT = mkdtempSync(join(tmpdir(), "lrcq-prov-"));
const EVROOT = join(ROOT, "evidence"); mkdirSync(EVROOT, { recursive: true });
const git = (args, cwd) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();

const REPO = join(ROOT, "repo"); mkdirSync(REPO, { recursive: true });
git(["init", "-q", "-b", "main"], REPO); git(["config", "user.email", "t@t"], REPO); git(["config", "user.name", "t"], REPO);
writeFileSync(join(REPO, "seed.txt"), "seed\n"); git(["add", "-A"], REPO); git(["commit", "-q", "-m", "seed"], REPO);
const WTROOT = join(ROOT, "wt"); mkdirSync(WTROOT, { recursive: true });
const FOREIGN = join(ROOT, "foreign"); mkdirSync(FOREIGN, { recursive: true });
git(["init", "-q", "-b", "main"], FOREIGN); git(["config", "user.email", "f@f"], FOREIGN); git(["config", "user.name", "f"], FOREIGN);
writeFileSync(join(FOREIGN, "s"), "s"); git(["add", "-A"], FOREIGN); git(["commit", "-q", "-m", "s"], FOREIGN);

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log("  FAIL " + name); } else console.log("  ok   " + name); };

const mkGitWt = (id, branch, mode) => { const p = join(WTROOT, id); git(["worktree", "add", "-q", "-b", branch, p, "HEAD"], REPO); writeFileSync(join(p, "stub-mode"), mode || "success"); return p; };
const mkDetachedWt = (id, mode) => { const p = join(WTROOT, id); git(["worktree", "add", "-q", "--detach", p, "HEAD"], REPO); writeFileSync(join(p, "stub-mode"), mode || "success"); return p; };

const ACT = (o = {}) => ({ schema_version: ACTIVATION_SCHEMA_VERSION, founder_signature: "sig", issued_epoch: 1000, expiry_epoch: 9999999999, lrcq_base_sha: "3794ec1", lrcq_base_tree: "7d44473", provider_candidate_sha: "PCAND", provider_candidate_tree: "PTREE", backlog_digest: "sha256:af688d14", run_id: "r", start_condition: "founder-authorized", hard_deadline_epoch: 9999999999, max_parallel_width: 3, per_job_timeout_s: 0.4, termination_grace_s: 0.2, max_output_bytes: 1048576, max_budget_usd: 5, allowed_tools: ["Read", "Edit", "Bash(git status:*)"], denied_tools: ["Bash(git push:*)", "Bash(git merge:*)", "Bash(git checkout:*)", "Bash(git switch:*)", "Bash(gh pr merge:*)", "Bash(git reset --hard:*)", "--dangerously-skip-permissions"], allowed_repository: REPO, allowed_branch_prefix: "lane/", allowed_worktree_root: WTROOT, allowed_evidence_root: EVROOT, provider_executable_path: STUB, provider_version: "stub-1", provider_executable_identity: "stub-id", provider_mode: "manual", subscription_only: true, prohibited_env: ["ANTHROPIC_API_KEY"], prohibited_commands: ["git push"], stop_conditions: ["deadline"], no_protected_main_merge: true, no_pr_merge: true, no_push_unless_authorized: true, no_m1: true, no_akior: true, no_customer_data: true, no_live_action: true, no_permission_bypass: true, no_deploy: true, no_external_comms: true, ...o });
const BIND = (o = {}) => ({ lrcq_base_sha: "3794ec1", lrcq_base_tree: "7d44473", provider_candidate_sha: "PCAND", provider_candidate_tree: "PTREE", backlog_digest: "sha256:af688d14", provider_path: STUB, provider_version: "stub-1", provider_identity: "stub-id", now_epoch: 2000, active_run: false, recovery_resolved: true, ...o });
const JOB = (id, o = {}) => ({ job_id: id, risk_class: o.risk || "WIDE_SAFE", effect_class: o.eff || "LOCAL_FS", gate_trigger: o.gate || "NONE", worktree: o.worktree !== undefined ? o.worktree : mkGitWt(id, o.branch || ("lane/" + id), o.mode), branch: o.branch || "lane/" + id, allowed_files: o.files || ["src/x/" + id + ".mjs"], forbidden_files: o.forbidden || ["src/founder_url_drop/"], tests: ["t"], required_evidence: ["e"] });

// ===== SCHEMA VALIDATION (hardened; pure) =====
ok("01 valid v2 activation passes", validateActivation(ACT(), BIND()).valid);
ok("02 wrong schema_version refused", !validateActivation(ACT({ schema_version: "lrcq-activation-1" }), BIND()).valid);
ok("03 missing provider_candidate_sha refused", !validateActivation(ACT({ provider_candidate_sha: undefined }), BIND()).valid);
ok("04 provider_candidate_sha mismatch refused", !validateActivation(ACT(), BIND({ provider_candidate_sha: "OTHER" })).valid);
ok("05 provider_candidate_tree mismatch refused", !validateActivation(ACT(), BIND({ provider_candidate_tree: "OTHER" })).valid);
ok("06 lrcq_base_sha mismatch refused", !validateActivation(ACT(), BIND({ lrcq_base_sha: "OTHER" })).valid);
ok("07 provider identity mismatch refused", !validateActivation(ACT(), BIND({ provider_identity: "OTHER" })).valid);
ok("08 missing max_budget_usd refused", !validateActivation(ACT({ max_budget_usd: undefined }), BIND()).valid);
ok("09 zero budget refused", !validateActivation(ACT({ max_budget_usd: 0 }), BIND()).valid);
ok("10 negative budget refused", !validateActivation(ACT({ max_budget_usd: -1 }), BIND()).valid);
ok("11 NaN budget refused", !validateActivation(ACT({ max_budget_usd: NaN }), BIND()).valid);
ok("12 Infinity budget refused", !validateActivation(ACT({ max_budget_usd: Infinity }), BIND()).valid);
ok("13 non-positive width refused", !validateActivation(ACT({ max_parallel_width: 0 }), BIND()).valid);
ok("14 non-finite timeout refused", !validateActivation(ACT({ per_job_timeout_s: Infinity }), BIND()).valid);
ok("15 expiry not later than issue refused", !validateActivation(ACT({ issued_epoch: 5000, expiry_epoch: 4000 }), BIND({ now_epoch: 1000 })).valid);
ok("16 issued in the future refused", !validateActivation(ACT({ issued_epoch: 999999 }), BIND({ now_epoch: 2000 })).valid);
ok("17 expired refused", !validateActivation(ACT({ expiry_epoch: 1500 }), BIND({ now_epoch: 2000 })).valid);
ok("18 deny-list missing git push detected", denyListSemanticGaps(["Bash(git merge:*)"]).includes("git push"));
ok("19 full deny-list has no gaps", denyListSemanticGaps(ACT().denied_tools).length === 0);
ok("20 empty denied_tools refused", !validateActivation(ACT({ denied_tools: [] }), BIND()).valid);
ok("21 permission-bypass mode refused", !validateActivation(ACT({ provider_mode: "bypassPermissions" }), BIND()).valid);

// ===== ARGV ENCODING (individual entries; mandatory budget; no bypass) =====
{ const a = buildArgv(ACT(), JOB("argv1"), "p"); const ai = a.indexOf("--allowedTools");
  ok("22 --allowedTools followed by INDIVIDUAL entries", a[ai + 1] === "Read" && a[ai + 2] === "Edit" && a[ai + 3] === "Bash(git status:*)");
  ok("23 --disallowedTools present with individual entries", a.includes("--disallowedTools") && a.includes("Bash(git push:*)") && a.includes("Bash(git merge:*)"));
  ok("24 mandatory --max-budget-usd with the exact value", a[a.indexOf("--max-budget-usd") + 1] === "5");
  const bypassIdx = a.indexOf("--dangerously-skip-permissions");
  ok("25 permission-mode manual; bypass token only in the deny segment (never an active flag)", a[a.indexOf("--permission-mode") + 1] === "manual" && bypassIdx > a.indexOf("--disallowedTools") && bypassIdx < a.indexOf("--add-dir")); }

// ===== ENV SCRUB =====
{ const env = scrubEnv(ACT(), { PATH: "/x", HOME: "/h", ANTHROPIC_API_KEY: "sk", GITHUB_TOKEN: "g", FOO: "b" });
  ok("26 env scrub keeps PATH/HOME, drops secrets + unlisted", env.PATH === "/x" && env.HOME === "/h" && env.ANTHROPIC_API_KEY === undefined && env.GITHUB_TOKEN === undefined && env.FOO === undefined); }

// ===== REAL GIT WORKTREE IDENTITY (pure; no spawn) =====
ok("27 correct registered worktree accepted", gitWorktreeIdentity(JOB("gi1", { branch: "lane/gi1" }), ACT(), null) === null);
ok("28 plain (non-git) directory refused", (() => { const p = join(WTROOT, "plain"); mkdirSync(p, { recursive: true }); return gitWorktreeIdentity({ worktree: p, branch: "lane/plain" }, ACT(), null) !== null; })());
ok("29 wrong repository refused", (() => { const p = join(WTROOT, "frn"); git(["worktree", "add", "-q", "-b", "lane/frn", p, "HEAD"], FOREIGN); writeFileSync(join(p, "stub-mode"), "success"); return gitWorktreeIdentity({ worktree: p, branch: "lane/frn" }, ACT(), null) !== null; })());
ok("30 wrong actual branch refused", gitWorktreeIdentity({ worktree: mkGitWt("gi3", "lane/actual", "success"), branch: "lane/claimed" }, ACT(), null) !== null);
ok("31 detached worktree refused", gitWorktreeIdentity({ worktree: mkDetachedWt("gi4", "success"), branch: "lane/gi4" }, ACT(), null) !== null);
ok("32 main worktree refused", gitWorktreeIdentity({ worktree: REPO, branch: "main" }, ACT(), null) !== null);
ok("33 metadata branch differing from actual branch refused", gitWorktreeIdentity({ worktree: mkGitWt("gi5", "lane/real5", "success"), branch: "lane/fake5" }, ACT(), null) !== null);

// ===== V4 SPAWN-BOUNDARY NEGATIVES (no capability exists in this process) =====
const spawnRefused = async (name, opts) => {
  const r = await runJob(ACT(), JOB(name.replace(/\W/g, "").slice(0, 12), { mode: "success" }), BIND(), { env: { PATH: process.env.PATH, HOME: process.env.HOME }, ...(opts || {}) });
  ok(name, r.outcome === "ACTIVATION_REFUSED" && r.started === false && r.pid === null && r.provider_invocation === "PROVIDER_NOT_ATTEMPTED" && (r.refusals || []).some((x) => /^V4_/.test(x)));
};
await spawnRefused("B1 no execution capability -> refused before ANY spawn", {});
await spawnRefused("B2 forged {_stage:'SUPERVISOR_EXECUTION'} -> refused", { executionCapability: { _stage: "SUPERVISOR_EXECUTION" } });
await spawnRefused("B3 plain object copying every capability field -> refused", { executionCapability: { _stage: "SUPERVISOR_EXECUTION", activation_identity: "sha256:x", provider_identity: "stub-id", supervisor_claim_digest: "sha256:y", supervisor_pid: process.pid, limits: {} } });
await spawnRefused("B4 a VERIFIED-shaped object (stage A) -> refused", { executionCapability: { _stage: "VERIFIED", activation_identity: "sha256:x" } });
await spawnRefused("B5 a CONSUMED-shaped object (stage B) -> refused", { executionCapability: { _stage: "CONSUMED", activation_identity: "sha256:x", __state: { launched: true } } });
await spawnRefused("B6 null capability -> refused", { executionCapability: null });
await spawnRefused("B7 string capability -> refused", { executionCapability: "SUPERVISOR_EXECUTION" });

// ===== THE REAL MATRIX, UNDER A GENUINE SUPERVISOR_EXECUTION CAPABILITY =====
{
  const res = await runV4Body({
    worldOpts: { prefix: "fg-prov-", nonce: "prov", realTemporal: true, providerPath: STUB, resolvedProviderTarget: STUB, providerVersion: "stub-1", providerIdentity: "stub-id" },
    bodyModule: BODY, bodyArgs: {},
    // the body needs the world base to scaffold its disposable git repo; it is passed via bodyArgs.base
    configName: "prov-exec-config.json",
  });
  reportChecks(res, ok);
}

// ===== CONTROLLER INTEGRATION (single-route collapse; no provider) =====
const CJOB = (id, wtBranch) => ({ job_id: id, title: "t", objective: "o", done_meaning: "d", source: "s", risk_class: "WIDE_SAFE", effect_class: "LOCAL_FS", dependencies: [], allowed_files: ["src/x/" + id + ".mjs"], forbidden_files: [], branch: wtBranch, worktree: mkGitWt(id, wtBranch, "success"), expected_outputs: ["x"], tests: ["t"], required_evidence: ["e"], checker_requirement: "ind", gate_trigger: "NONE", estimated_minutes: 5, max_attempts: 3, correction_cycle: 0, status: "PENDING" });
{ const c = new Controller({ run_id: "rc", now: 2000, maxWidth: 1, mode: MODE.REAL }); c.load([CJOB("rj", "lane/rj")]); c.refill();
  const r = await c.stepReal("rj", ACT(), BIND(), { env: { PATH: process.env.PATH, HOME: process.env.HOME } });
  const evs = c.events.filter((e) => e.job_id === "rj").map((e) => e.event_type);
  ok("59 controller stepReal REFUSES real execution (authority-route collapse FG-LRCQ-FINAL-001)", r.ok === false && r.reason === "REAL_EXECUTION_REQUIRES_RUN_HARNESS");
  ok("60 stepReal invokes NO provider + seals/completes NOTHING", r.invoked_provider === false && r.completed === false && r.sealed === false && c.byId.get("rj").status !== "COMPLETED" && !evs.includes("evidence_sealed"));
  ok("61 no accept/merge inference", c.snapshot().merged === false && c.snapshot().accepted === false); }
{ const c = new Controller({ run_id: "rcg", now: 2000, maxWidth: 1, mode: MODE.REAL }); c.load([CJOB("gj", "lane/gj")]); c.refill(); c.raiseGate("FOUNDER_GATE", "founder review", "spawn", "founder decides");
  const r = await c.stepReal("gj", ACT(), BIND(), { env: { PATH: process.env.PATH, HOME: process.env.HOME } });
  ok("62 founder-gated job still not completed via controller", r.ok === false && c.byId.get("gj").status !== "COMPLETED"); }
{ const c = new Controller({ run_id: "rc2", now: 2000, maxWidth: 1, mode: MODE.REAL });
  c.load([{ job_id: "nj", title: "t", objective: "o", done_meaning: "d", source: "s", risk_class: "NARROW_SENSITIVE", effect_class: "LOCAL_FS", dependencies: [], allowed_files: ["src/x/nj.mjs"], forbidden_files: [], branch: "lane/nj", worktree: "/wt/nj", expected_outputs: ["x"], tests: ["t"], required_evidence: ["e"], checker_requirement: "ind", gate_trigger: "NONE", estimated_minutes: 5, max_attempts: 3, correction_cycle: 0, status: "PENDING" }]);
  ok("63 NARROW job HELD at load", c.byId.get("nj").status === "HELD");
  ok("64 step() refuses in REAL mode (single route is stepReal)", c.step("nj").ok === false); }

try { rmSync(ROOT, { recursive: true, force: true }); } catch { /* */ }
console.log("\nLRCQ REAL-PROVIDER SELFTEST: " + (n - fails.length) + "/" + n + " passed");
if (fails.length) { console.log("FAILED: " + fails.join(", ")); process.exit(1); }
process.exit(0);
