// FounderGate LRCQ — TEST-SUPPORT body: EXACT full 25-job production-route rehearsal (FG-LRCQ-ACT-013,
// migrated to V4 by FG-LRCQ-ACT-029) executed under a GENUINE SUPERVISOR_EXECUTION capability. Drives the
// FROZEN backlog-v2 through the real components (setup-manager -> identity envelope render -> runJob
// transport -> builder-output validation -> execMachineVerifier(runs the immutable verifier) -> checker
// route -> budget ledger -> teardown) with the protocol-faithful deterministic stub. NO real Claude.
import { mkdirSync, writeFileSync, existsSync, readFileSync, copyFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { setupManager } from "../../../run-harness/setup-manager.mjs";
import { runJob } from "../../../provider/real-provider.mjs";
import { buildIdentityEnvelope } from "../../../provider/identity-envelope.mjs";
import { validateBuilderOutput, validateCheckerOutput } from "../../../provider/provider-output.mjs";
import { execMachineVerifier } from "../../../run-harness/machine-verifier-exec.mjs";
import { BudgetLedger } from "../../../run-harness/budget-ledger.mjs";
import { resolveRunPlan } from "../../../run-harness/run-plan.mjs";
import { projectLegacyActivationV4 } from "../../../run-harness/v4-legacy-projection.mjs";

export default async function bodyFn(cap, args) {
  const checks = [];
  const ok = (name, cond, detail) => checks.push({ name, ok: !!cond, detail: cond ? undefined : detail });
  const git = (a, cwd) => execFileSync("git", a, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  const RID = cap.run_id;
  const SRCREPO = args.srcRepo;
  const BASE = join(args.base, "full"); mkdirSync(BASE, { recursive: true });
  const EVROOT = join(BASE, "ev"); mkdirSync(EVROOT, { recursive: true });
  // disposable CANDIDATE repo carrying the immutable verifier at its exact path
  const REPO = join(BASE, "repo");
  mkdirSync(join(REPO, "tools/terminal0/lrcq/verifiers"), { recursive: true });
  copyFileSync(join(SRCREPO, "tools/terminal0/lrcq/verifiers/fixture-verifier.mjs"), join(REPO, "tools/terminal0/lrcq/verifiers/fixture-verifier.mjs"));
  git(["init", "-q", "-b", "main"], REPO); git(["config", "user.email", "t@t"], REPO); git(["config", "user.name", "t"], REPO);
  git(["add", "-A"], REPO); git(["commit", "-q", "-m", "seed+verifier"], REPO);
  const WTROOT = join(BASE, "worktrees"); mkdirSync(WTROOT, { recursive: true });
  const manifest = { branch_prefix: "lane/real-run-", permitted_worktree_root: WTROOT };

  const backlog = JSON.parse(readFileSync(join(SRCREPO, ".foundergate/backlog/first-real-five-hour-run-v2.json"), "utf8"));
  const jobs = backlog.jobs;
  ok("00 loaded FROZEN backlog-v2 (exact 25 jobs)", jobs.length === 25);

  const MAN = { repository_root: REPO, branch_prefix: "lane/", permitted_worktree_root: WTROOT, evidence_root: EVROOT, per_job_timeout_s: 8, termination_grace_s: 1, output_cap_bytes: 1048576, max_parallel_width: 2, max_cost_usd: 5 };
  const LOADED = { allowed_tools_manifest_path: { builder: ["Read", "Write", "Edit"], checker: ["Read", "Grep"] } };
  const ACT = (role = "builder") => projectLegacyActivationV4(cap, MAN, LOADED, role, { evidenceRoot: EVROOT });
  const BIND = { lrcq_base_sha: cap.lrcq_base_sha, lrcq_base_tree: cap.lrcq_base_tree, provider_candidate_sha: cap.provider_candidate_sha, provider_candidate_tree: cap.provider_candidate_tree, backlog_digest: cap.backlog_digest, provider_path: cap.provider_executable_path, provider_version: cap.provider_version, provider_identity: cap.provider_identity, run_harness_candidate_sha: cap.evaluated_candidate, now_epoch: cap.issued_epoch + 100, active_run: false, recovery_resolved: true };
  const ENV = { env: { PATH: process.env.PATH, HOME: process.env.HOME }, executionCapability: cap };
  const mv = execMachineVerifier();

// ---- SETUP: 25 real worktrees ----
const setup = setupManager(jobs, RID, manifest, { git, repoRoot: REPO, candidateRef: "HEAD" });
ok("01 setup manager created 25 registered worktrees", setup.ok === true && setup.created.length === 25);

// ---- DRIVE all 25 through the production route under one $10 ledger ----
const ledger = new BudgetLedger(10);
const results = {}; let allBuilderValid = true, allCheckerClean = true, allMV = true, allTearGone = true;
for (const job of jobs) {
  const plan = resolveRunPlan(job, RID, manifest);
  const jobLoc = { ...job, branch: plan.branch, worktree: plan.worktree, allowed_files: job.allowed_files, forbidden_files: job.forbidden_files, tests: job.test_commands, expected_output_paths: job.expected_output_paths, required_evidence_files: [], max_changed_lines: job.max_changed_lines };
  // builder session
  const bs = "bs-" + job.job_id;
  const bReserve = ledger.reserve({ role: "builder", job: job.job_id, attempt: 1 }, job.builder_cost_cap_usd, job.checker_cost_cap_usd);
  const benv = buildIdentityEnvelope({ role: "builder", run_id: RID, job_id: job.job_id, attempt: 1, session_id: bs, candidate_sha: "SHA", candidate_tree: "TREE", backlog_digest: "sha256:b", resolved_plan_digest: "sha256:p", branch: plan.branch, worktree: plan.worktree, lease_id: "L-" + job.job_id, lease_digest: "sha256:l", allowed_tools_digest: "sha256:a", denied_tools_digest: "sha256:d", evidence_path: join(EVROOT, job.job_id), deadline_epoch: 9e12, session_cost_cap_usd: bReserve.session_cap_usd });
  const bout = await runJob(ACT(), { ...jobLoc, role: "builder", _identity_envelope: benv }, BIND, { ...ENV, transport: true, role: "builder" });
  ledger.commit({ role: "builder", job: job.job_id, attempt: 1 }, bout.provider_cost_usd, bout.transport_digest);
  const bValid = bout.outcome === "SUCCESS" && validateBuilderOutput(bout.parsed_output, { run_id: RID, job_id: job.job_id, attempt: 1, session_id: bs }).valid; if (!bValid) allBuilderValid = false;
  if (bout.tree_gone !== true) allTearGone = false;
  // machine verification (executes the immutable verifier argv against the produced file)
  const mvr = await mv(jobLoc, bout, { evidenceDir: join(EVROOT, job.job_id) }); if (!mvr.pass) allMV = false;
  // checker session
  const cs = "cs-" + job.job_id;
  const cReserve = ledger.reserve({ role: "checker", job: job.job_id, attempt: 1 }, job.checker_cost_cap_usd);
  const cenv = buildIdentityEnvelope({ role: "checker", run_id: RID, job_id: job.job_id, attempt: 1, session_id: cs, candidate_sha: "SHA", candidate_tree: "TREE", backlog_digest: "sha256:b", resolved_plan_digest: "sha256:p", branch: plan.branch, worktree: plan.worktree, lease_id: "CL-" + job.job_id, lease_digest: "sha256:l", allowed_tools_digest: "sha256:a", denied_tools_digest: "sha256:d", evidence_path: join(EVROOT, job.job_id), deadline_epoch: 9e12, session_cost_cap_usd: cReserve.session_cap_usd, builder_transaction_id: "tx-" + job.job_id, machine_verifier_report_digest: mvr.report_digest });
  cenv.checker_session_id = cs; cenv.checker_prompt_digest = "cpd-" + job.job_id; cenv.machine_verifier_digest = mvr.report_digest;
  const cout = await runJob(ACT("checker"), { ...jobLoc, role: "checker", _checker_session: cs, _identity_envelope: cenv }, BIND, { ...ENV, transport: true, role: "checker" });
  ledger.commit({ role: "checker", job: job.job_id, attempt: 1 }, cout.provider_cost_usd, cout.transport_digest);
  const cv = validateCheckerOutput(cout.parsed_output, { run_id: RID, job_id: job.job_id, attempt: 1, builder_transaction_id: "tx-" + job.job_id, machine_verifier_digest: mvr.report_digest }); if (!(cv.valid && cv.verdict === "CLEAN")) allCheckerClean = false;
  results[job.job_id] = { bValid, mv: mvr.pass, verdict: cv.verdict, completed: bValid && mvr.pass && cv.valid && cv.verdict === "CLEAN" && bout.tree_gone === true };
}
const completed = Object.values(results).filter((r) => r.completed).length;
ok("02 all 25 builder outputs validate (transport + identity-bound)", allBuilderValid === true);
ok("03 all 25 machine verifications PASS (immutable verifier executed)", allMV === true);
ok("04 all 25 checker verdicts CLEAN (bound to builder tx + mv digest)", allCheckerClean === true);
ok("05 all 25 provider process trees confirmed gone", allTearGone === true);
ok("06 all 25 jobs COMPLETED through the exact production route", completed === 25);
ok("07 cumulative cost <= $10 (builder + checker both counted)", ledger.spent() <= 10 && ledger.overCeiling() === false);
ok("08 cumulative cost is nonzero (real per-session costs accrued)", ledger.spent() > 0);

// ---- teardown all worktrees ----
setup.teardown();
ok("09 teardown removed all 25 worktrees", setup.created.every((c) => !existsSync(c.worktree)));
ok("10 protected repo main untouched", git(["rev-parse", "--abbrev-ref", "HEAD"], REPO) === "main");

// ---- NEGATIVE: $10 budget cannot be exceeded even if session caps summed higher ----
{ const L = new BudgetLedger(1); let stopped = false; for (const job of jobs) { const r = L.reserve({ role: "builder", job: job.job_id, attempt: 1 }, 0.25); if (!r.ok) { stopped = true; break; } L.commit({ role: "builder", job: job.job_id, attempt: 1 }, 0.25); }
  ok("11 tight budget -> CONTROLLED_BUDGET_STOP (never exceeds cap)", stopped === true && L.spent() <= 1); }
// ---- NEGATIVE: a founder-gated job is never set up ----
{ const r = setupManager([{ job_id: "fg", risk_class: "WIDE_SAFE", effect_class: "LOCAL_FS", gate_trigger: "FOUNDER_GATE", dependencies: [], allowed_files: ["src/fg.mjs"] }], "NEG", manifest, { git, repoRoot: REPO, candidateRef: "HEAD" });
  ok("12 founder-gate job never set up (no worktree)", r.created.length === 0); r.teardown && r.teardown(); }


  try { git(["worktree", "prune"], REPO); } catch { /* */ }
  return { checks };
}
