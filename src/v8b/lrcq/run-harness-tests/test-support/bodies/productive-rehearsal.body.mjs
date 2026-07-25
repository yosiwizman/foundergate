// FounderGate LRCQ — TEST-SUPPORT body: production-equivalent deterministic rehearsal
// (FG-LRCQ-ACT-005..008, migrated to V4 by FG-LRCQ-ACT-029) executed under a GENUINE SUPERVISOR_EXECUTION
// capability. Proves builder -> REAL machine verification (executes tests) -> read-only checker STDOUT
// verdict -> evidence seal -> teardown, using the ACTUAL provider adapter (runJob) + execMachineVerifier +
// provider-output validation with a deterministic local CLI stub. NO real Claude.
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { runJob } from "../../../provider/real-provider.mjs";
import { validateBuilderOutput, validateCheckerOutput } from "../../../provider/provider-output.mjs";
import { execMachineVerifier } from "../../../run-harness/machine-verifier-exec.mjs";
import { projectLegacyActivationV4 } from "../../../run-harness/v4-legacy-projection.mjs";

export default async function bodyFn(cap, args) {
  const checks = [];
  const ok = (name, cond, detail) => checks.push({ name, ok: !!cond, detail: cond ? undefined : detail });
  const git = (a, cwd) => execFileSync("git", a, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  const RID = cap.run_id;
  const BASE = join(args.base, "reh"); mkdirSync(BASE, { recursive: true });
  const EVROOT = join(BASE, "evidence"); mkdirSync(EVROOT, { recursive: true });
  const REPO = join(BASE, "repo"); mkdirSync(REPO, { recursive: true });
  git(["init", "-q", "-b", "main"], REPO); git(["config", "user.email", "t@t"], REPO); git(["config", "user.name", "t"], REPO);
  mkdirSync(join(REPO, "src")); writeFileSync(join(REPO, "seed.txt"), "seed\n"); git(["add", "-A"], REPO); git(["commit", "-q", "-m", "seed"], REPO);
  const WTROOT = join(BASE, "wt"); mkdirSync(WTROOT, { recursive: true });

  const MAN = { repository_root: REPO, branch_prefix: "lane/", permitted_worktree_root: WTROOT, evidence_root: EVROOT, per_job_timeout_s: 5, termination_grace_s: 1, output_cap_bytes: 1048576, max_parallel_width: 2, max_cost_usd: 5 };
  const LOADED = { allowed_tools_manifest_path: { builder: ["Read", "Write", "Edit"], checker: ["Read", "Grep"] } };
  const ACT = (role = "builder") => projectLegacyActivationV4(cap, MAN, LOADED, role, { evidenceRoot: EVROOT });
  const BIND = { lrcq_base_sha: cap.lrcq_base_sha, lrcq_base_tree: cap.lrcq_base_tree, provider_candidate_sha: cap.provider_candidate_sha, provider_candidate_tree: cap.provider_candidate_tree, backlog_digest: cap.backlog_digest, provider_path: cap.provider_executable_path, provider_version: cap.provider_version, provider_identity: cap.provider_identity, run_harness_candidate_sha: cap.evaluated_candidate, now_epoch: cap.issued_epoch + 100, active_run: false, recovery_resolved: true };
  const ENV = { env: { PATH: process.env.PATH, HOME: process.env.HOME }, executionCapability: cap };

  function setupWt(id, opts = {}) {
    const p = join(WTROOT, id); git(["worktree", "add", "-q", "-b", "lane/" + id, p, "HEAD"], REPO);
    writeFileSync(join(p, "stub-mode"), opts.mode || "success");
    const ident = { run_id: RID, job_id: id, attempt: 1, allowed_file: join(p, "src", id + ".mjs"), allowed_file_rel: "src/" + id + ".mjs", tests: ["t"], ...opts.identity };
    writeFileSync(join(p, "identity.json"), JSON.stringify(ident));
    return { p, ident };
  }
  const job = (id, over = {}) => ({ job_id: id, title: "t", objective: "o", done_meaning: "d", source: "s", risk_class: "WIDE_SAFE", effect_class: "LOCAL_FS", gate_trigger: "NONE", allowed_files: ["src/"], forbidden_files: ["secrets"], branch: "lane/" + id, worktree: join(WTROOT, id), max_changed_lines: 100, tests: [["node", "-e", "process.exit(0)"]], expected_output_paths: ["src/" + id + ".mjs"], required_evidence_files: [], ...over });

// ============ POSITIVE FULL ROUTE ============
{ const { p, ident } = setupWt("j1", { identity: { session_id: "bs1", prompt_digest: "bpd1" } });
  const bout = await runJob(ACT(), job("j1"), BIND, ENV);
  ok("01 builder spawn -> SUCCESS + tree_gone true", bout.outcome === "SUCCESS" && bout.tree_gone === true);
  ok("02 builder parsed_output returned + schema-valid + bound", validateBuilderOutput(bout.parsed_output, { run_id: RID, job_id: "j1", attempt: 1, session_id: "bs1", prompt_digest: "bpd1" }).valid === true);
  ok("03 builder modified ONLY its allowed file", existsSync(ident.allowed_file));
  const mv = await execMachineVerifier()(job("j1"), bout, { evidenceDir: join(EVROOT, "j1") });
  ok("04 machine verifier EXECUTES the real test (exit0) + requires tree_gone -> PASS", mv.pass === true && mv.checks.some((c) => /test\[0\]_executed_exit0/.test(c.name) && c.ok) && mv.checks.some((c) => c.name === "tree_gone" && c.ok));
  const mvDigest = mv.report_digest;
  // checker session (read-only): denied Write/Edit; identity carries checker session + mv digest + builder tx
  writeFileSync(join(p, "identity.json"), JSON.stringify({ ...ident, checker_session_id: "cs1", checker_prompt_digest: "cpd1", builder_transaction_id: "tx1", machine_verifier_digest: mvDigest }));
  const cout = await runJob(ACT("checker"), { ...job("j1"), _checker_session: "cs1" }, BIND, ENV);
  const cval = validateCheckerOutput(cout.parsed_output, { run_id: RID, job_id: "j1", attempt: 1, session_id: "cs1", prompt_digest: "cpd1", builder_transaction_id: "tx1", machine_verifier_digest: mvDigest });
  ok("05 checker spawn (read-only prompt) -> structured verdict via STDOUT", cout.outcome === "SUCCESS" && cout.role === "checker" && cout.parsed_output.role === "checker");
  ok("06 checker verdict validated + exactly bound + CLEAN", cval.valid === true && cval.verdict === "CLEAN");
  // launcher/evidence-plane (NOT checker) writes the attempt-bound verdict after validation
  const vdir = join(EVROOT, "j1", "attempt-1"); mkdirSync(vdir, { recursive: true });
  if (cval.valid) writeFileSync(join(vdir, "checker-verdict.json"), JSON.stringify({ ...cout.parsed_output, written_by: "evidence-plane" }));
  ok("07 attempt-bound verdict written by evidence plane (not the checker)", existsSync(join(vdir, "checker-verdict.json"))); }

// ============ NEGATIVES (all fail closed) ============
{ setupWt("nb", {}); const bout = await runJob(ACT(), job("nb"), BIND, ENV); // checker gets BUILDER prompt (no _checker_session)
  ok("08 checker receiving builder prompt -> builder output -> checker validation refuses", validateCheckerOutput(bout.parsed_output, { run_id: RID, job_id: "nb", attempt: 1 }).valid === false); }
{ setupWt("mf", { mode: "malformed" }); const bout = await runJob(ACT(), job("mf"), BIND, ENV); ok("09 malformed output -> not SUCCESS", bout.outcome !== "SUCCESS"); }
{ setupWt("wr", { mode: "wrong-role" }); const bout = await runJob(ACT(), job("wr"), BIND, ENV); ok("10 wrong-role output refused by validator", validateBuilderOutput(bout.parsed_output, { run_id: RID, job_id: "wr", attempt: 1 }).valid === false); }
{ setupWt("tf"); const bout = await runJob(ACT(), job("tf"), BIND, ENV); const mv = await execMachineVerifier()(job("tf", { tests: [["node", "-e", "process.exit(1)"]] }), bout, { evidenceDir: join(EVROOT, "tf") }); ok("11 failing test -> machine verification FAIL", mv.pass === false); }
{ setupWt("mo"); const bout = await runJob(ACT(), job("mo"), BIND, ENV); const mv = await execMachineVerifier()(job("mo", { expected_output_paths: ["src/DOES-NOT-EXIST.mjs"] }), bout, { evidenceDir: join(EVROOT, "mo") }); ok("12 missing expected output -> machine verification FAIL", mv.pass === false); }
{ setupWt("me"); const bout = await runJob(ACT(), job("me"), BIND, ENV); const mv = await execMachineVerifier()(job("me", { required_evidence_files: [{ path: "nope.json", sha256: "sha256:x" }] }), bout, { evidenceDir: join(EVROOT, "me") }); ok("13 missing required evidence file -> machine verification FAIL", mv.pass === false); }
{ setupWt("eh"); const bout = await runJob(ACT(), job("eh"), BIND, ENV); const ed = join(EVROOT, "eh"); mkdirSync(ed, { recursive: true }); writeFileSync(join(ed, "ev.json"), "content"); const mv = await execMachineVerifier()(job("eh", { required_evidence_files: [{ path: "ev.json", sha256: "sha256:" + "0".repeat(64) }] }), bout, { evidenceDir: ed }); ok("14 evidence hash mismatch -> machine verification FAIL", mv.pass === false); }
{ setupWt("tg"); const bout = await runJob(ACT(), job("tg"), BIND, ENV); const mv = await execMachineVerifier()(job("tg"), { ...bout, tree_gone: false }, { evidenceDir: join(EVROOT, "tg") }); ok("15 tree_gone=false -> machine verification FAIL", mv.pass === false); }
{ const mv = await execMachineVerifier()(job("tg"), { tree_gone: null }, { evidenceDir: join(EVROOT, "tg") }); ok("16 absent tree_gone -> machine verification FAIL", mv.pass === false); }
{ setupWt("cf", { mode: "checker-findings", identity: { checker_session_id: "cs", checker_prompt_digest: "cpd", builder_transaction_id: "tx", machine_verifier_digest: "sha256:x" } }); const cout = await runJob(ACT("checker"), { ...job("cf"), _checker_session: "cs" }, BIND, ENV); const cval = validateCheckerOutput(cout.parsed_output, { run_id: RID, job_id: "cf", attempt: 1 }); ok("17 checker FINDINGS is not CLEAN", cval.verdict === "FINDINGS" && cval.verdict !== "CLEAN"); }
// stale verdict for a DIFFERENT attempt must not validate for this attempt
{ ok("18 stale verdict (wrong attempt) refused", validateCheckerOutput({ schema: "lrcq-checker-output-1", role: "checker", run_id: RID, job_id: "j1", attempt: 99, checker_session_id: "cs1", checker_prompt_digest: "cpd1", reviewed_builder_transaction_id: "tx1", reviewed_machine_verifier_digest: "d", criteria: [{ criterion_id: "c", result: "PASS" }], verdict: "CLEAN" }, { run_id: RID, job_id: "j1", attempt: 1 }).valid === false); }


  try { git(["worktree", "prune"], REPO); } catch { /* */ }
  return { checks };
}
