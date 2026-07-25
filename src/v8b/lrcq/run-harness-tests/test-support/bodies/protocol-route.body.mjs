// FounderGate LRCQ — TEST-SUPPORT body: ACT-009 PRODUCTION-ROUTE proof under a GENUINE
// SUPERVISOR_EXECUTION capability (FG-LRCQ-ACT-029). Identity is rendered into the real prompt (no
// identity.json), the worker recovers it from the prompt, emits the transport envelope, and runJob parses it
// strictly. Real runJob spawn of the deterministic protocol stub. NO real Claude.
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { runJob } from "../../../provider/real-provider.mjs";
import { buildIdentityEnvelope } from "../../../provider/identity-envelope.mjs";
import { validateBuilderOutput, validateCheckerOutput } from "../../../provider/provider-output.mjs";
import { projectLegacyActivationV4 } from "../../../run-harness/v4-legacy-projection.mjs";

export default async function bodyFn(cap, args) {
  const checks = [];
  const ok = (name, cond, detail) => checks.push({ name, ok: !!cond, detail: cond ? undefined : detail });
  const git = (a, cwd) => execFileSync("git", a, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();

  const BASE = join(args.base, "proto"); mkdirSync(BASE, { recursive: true });
  const EVROOT = join(BASE, "ev"); mkdirSync(EVROOT, { recursive: true });
  const REPO = join(BASE, "repo"); mkdirSync(join(REPO, "src"), { recursive: true });
  git(["init", "-q", "-b", "main"], REPO); git(["config", "user.email", "t@t"], REPO); git(["config", "user.name", "t"], REPO);
  writeFileSync(join(REPO, "seed.txt"), "s"); git(["add", "-A"], REPO); git(["commit", "-q", "-m", "s"], REPO);
  const WTROOT = join(BASE, "wt"); mkdirSync(WTROOT, { recursive: true });

  const MAN = { repository_root: REPO, branch_prefix: "lane/", permitted_worktree_root: WTROOT, evidence_root: EVROOT, per_job_timeout_s: 5, termination_grace_s: 1, output_cap_bytes: 1048576, max_parallel_width: 2, max_cost_usd: 5 };
  const LOADED = { allowed_tools_manifest_path: { builder: ["Read", "Write", "Edit"], checker: ["Read", "Grep"] } };
  const ACT = (role = "builder") => projectLegacyActivationV4(cap, MAN, LOADED, role, { evidenceRoot: EVROOT });
  const BIND = { lrcq_base_sha: cap.lrcq_base_sha, lrcq_base_tree: cap.lrcq_base_tree, provider_candidate_sha: cap.provider_candidate_sha, provider_candidate_tree: cap.provider_candidate_tree, backlog_digest: cap.backlog_digest, provider_path: cap.provider_executable_path, provider_version: cap.provider_version, provider_identity: cap.provider_identity, run_harness_candidate_sha: cap.evaluated_candidate, now_epoch: cap.issued_epoch + 100, active_run: false, recovery_resolved: true };
  const ENV = { env: { PATH: process.env.PATH, HOME: process.env.HOME }, executionCapability: cap };
  const RID = cap.run_id;
  const wt = (id) => { const p = join(WTROOT, id); git(["worktree", "add", "-q", "-b", "lane/" + id, p, "HEAD"], REPO); writeFileSync(join(p, "stub-mode"), "success"); return p; };
  const envelope = (id, over = {}) => buildIdentityEnvelope({ role: "builder", run_id: RID, job_id: id, attempt: 1, session_id: "bs-" + id, candidate_sha: "SHA", candidate_tree: "TREE", backlog_digest: "sha256:b", resolved_plan_digest: "sha256:p", branch: "lane/" + id, worktree: join(WTROOT, id), lease_id: "L-" + id, lease_digest: "sha256:l", allowed_tools_digest: "sha256:a", denied_tools_digest: "sha256:d", evidence_path: join(EVROOT, id), deadline_epoch: 9e12, session_cost_cap_usd: 0.25, ...over });
  const job = (id, over = {}) => ({ job_id: id, title: "t", objective: "endurance fixture " + id, done_meaning: "d", source: "s", risk_class: "WIDE_SAFE", effect_class: "LOCAL_FS", gate_trigger: "NONE", allowed_files: ["src/" + id + ".mjs"], forbidden_files: ["secrets"], branch: "lane/" + id, worktree: join(WTROOT, id), tests: ["t"], required_evidence: ["e"], ...over });

  // ---- PROTOCOL builder: identity ONLY from the rendered prompt; transport-wrapped output ----
  { const p = wt("j1"); const env = envelope("j1");
    const out = await runJob(ACT(), { ...job("j1"), role: "builder", _identity_envelope: env }, BIND, { ...ENV, transport: true, role: "builder" });
    ok("01 protocol builder via runJob -> SUCCESS (transport parsed) + cost surfaced", out.outcome === "SUCCESS" && typeof out.provider_cost_usd === "number" && out.provider_cost_usd > 0, out.outcome + " " + JSON.stringify(out.refusals || []));
    ok("02 builder output recovered identity from the RENDERED PROMPT (no identity.json present)", !existsSync(join(p, "identity.json")) && out.parsed_output && out.parsed_output.run_id === RID && out.parsed_output.job_id === "j1");
    ok("03 builder output validates + exactly bound", validateBuilderOutput(out.parsed_output, { run_id: RID, job_id: "j1", attempt: 1, session_id: "bs-j1" }).valid === true);
    ok("04 builder produced the fixture in its allowed file", existsSync(join(p, "src", "j1.mjs"))); }

  // ---- identity drift: wrong run_id in the envelope -> echoed output mismatches the bind -> refused ----
  { wt("j2"); const env = envelope("j2", { run_id: "WRONG" });
    const out = await runJob(ACT(), { ...job("j2"), role: "builder", _identity_envelope: env }, BIND, { ...ENV, transport: true, role: "builder" });
    ok("05 prompt identity drift (wrong run_id) -> builder output fails bind validation", validateBuilderOutput(out.parsed_output, { run_id: RID, job_id: "j2", attempt: 1 }).valid === false); }

  // ---- transport: unknown / malformed envelope from the worker -> runJob NOT SUCCESS ----
  { const p = wt("j3"); writeFileSync(join(p, "stub-mode"), "unknown-envelope");
    const out = await runJob(ACT(), { ...job("j3"), role: "builder", _identity_envelope: envelope("j3") }, BIND, { ...ENV, transport: true, role: "builder" });
    ok("06 unknown transport envelope -> FAILED (strict parser rejects)", out.outcome !== "SUCCESS"); }
  { const p = wt("j4"); writeFileSync(join(p, "stub-mode"), "malformed");
    const out = await runJob(ACT(), { ...job("j4"), role: "builder", _identity_envelope: envelope("j4") }, BIND, { ...ENV, transport: true, role: "builder" });
    ok("07 malformed transport -> FAILED", out.outcome !== "SUCCESS"); }

  // ---- PROTOCOL checker: read-only, transport-wrapped verdict, bound to builder tx + mv digest ----
  { wt("c1"); const env = buildIdentityEnvelope({ role: "checker", run_id: RID, job_id: "c1", attempt: 1, session_id: "cs-c1", candidate_sha: "SHA", candidate_tree: "TREE", backlog_digest: "sha256:b", resolved_plan_digest: "sha256:p", branch: "lane/c1", worktree: join(WTROOT, "c1"), lease_id: "CL", lease_digest: "sha256:l", allowed_tools_digest: "sha256:a", denied_tools_digest: "sha256:d", evidence_path: join(EVROOT, "c1"), deadline_epoch: 9e12, session_cost_cap_usd: 0.08, builder_transaction_id: "tx-c1", machine_verifier_report_digest: "sha256:mv" });
    env.checker_session_id = "cs-c1"; env.checker_prompt_digest = "cpd-c1"; env.builder_transaction_id = "tx-c1"; env.machine_verifier_digest = "sha256:mv";
    const out = await runJob(ACT("checker"), { ...job("c1"), role: "checker", _checker_session: "cs-c1", _identity_envelope: env }, BIND, { ...ENV, transport: true, role: "checker" });
    const cv = validateCheckerOutput(out.parsed_output, { run_id: RID, job_id: "c1", attempt: 1, builder_transaction_id: "tx-c1", machine_verifier_digest: "sha256:mv" });
    ok("08 protocol checker via runJob -> structured verdict (transport) bound + CLEAN", out.outcome === "SUCCESS" && cv.valid === true && cv.verdict === "CLEAN", out.outcome + " " + JSON.stringify(cv.refusals || [])); }

  try { git(["worktree", "prune"], REPO); } catch { /* */ }
  return { checks };
}
