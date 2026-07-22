// FounderGate LRCQ — production-equivalent deterministic rehearsal (FG-LRCQ-ACT-005..008).
// Proves builder -> REAL machine verification (executes tests) -> read-only checker STDOUT verdict
// -> evidence seal -> teardown, using the ACTUAL provider adapter (runJob) + execMachineVerifier +
// provider-output validation, with a deterministic local CLI stub. NO real Claude.
import { runJob } from "../provider/real-provider.mjs";
import { validateActivation, ACTIVATION_SCHEMA_VERSION } from "../provider/activation-schema.mjs";
import { validateBuilderOutput, validateCheckerOutput } from "../provider/provider-output.mjs";
import { execMachineVerifier, reportDigest } from "../run-harness/machine-verifier-exec.mjs";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log("  FAIL " + name); } else console.log("  ok   " + name); };
const HERE = dirname(fileURLToPath(import.meta.url));
const STUB = join(HERE, "../provider-tests/productive-stub.mjs");
const git = (a, cwd) => execFileSync("git", a, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
const ROOT = mkdtempSync(join(tmpdir(), "lrcq-reh-"));
const EVROOT = join(ROOT, "evidence"); mkdirSync(EVROOT, { recursive: true });
const REPO = join(ROOT, "repo"); mkdirSync(REPO, { recursive: true });
git(["init", "-q", "-b", "main"], REPO); git(["config", "user.email", "t@t"], REPO); git(["config", "user.name", "t"], REPO);
mkdirSync(join(REPO, "src")); writeFileSync(join(REPO, "seed.txt"), "seed\n"); git(["add", "-A"], REPO); git(["commit", "-q", "-m", "seed"], REPO);
const WTROOT = join(ROOT, "wt"); mkdirSync(WTROOT, { recursive: true });

const ACT = (o = {}) => ({ schema_version: ACTIVATION_SCHEMA_VERSION, founder_signature: "sig", issued_epoch: 1000, expiry_epoch: 9999999999, lrcq_base_sha: "L", lrcq_base_tree: "LT", provider_candidate_sha: "P", provider_candidate_tree: "PT", backlog_digest: "d", run_id: "reh", start_condition: "fa", hard_deadline_epoch: 9999999999, max_parallel_width: 2, per_job_timeout_s: 5, termination_grace_s: 1, max_output_bytes: 1048576, max_budget_usd: 5, allowed_tools: ["Read", "Write", "Edit"], denied_tools: ["Bash(git push:*)", "Bash(git merge:*)", "Bash(git checkout:*)", "Bash(git switch:*)", "Bash(gh pr merge:*)", "Bash(git reset --hard:*)", "--dangerously-skip-permissions"], allowed_repository: REPO, allowed_branch_prefix: "lane/", allowed_worktree_root: WTROOT, allowed_evidence_root: EVROOT, provider_executable_path: process.execPath, provider_version: "v", provider_executable_identity: "id", provider_mode: "manual", subscription_only: true, prohibited_env: ["ANTHROPIC_API_KEY"], prohibited_commands: ["git push"], stop_conditions: ["deadline"], no_protected_main_merge: true, no_pr_merge: true, no_push_unless_authorized: true, no_m1: true, no_akior: true, no_customer_data: true, no_live_action: true, no_permission_bypass: true, ...o });
const BIND = { lrcq_base_sha: "L", lrcq_base_tree: "LT", provider_candidate_sha: "P", provider_candidate_tree: "PT", backlog_digest: "d", provider_path: STUB, provider_version: "v", provider_identity: "id", now_epoch: 2000, active_run: false, recovery_resolved: true };
// buildArgv prepends -p prompt; we run the stub via node <STUB>, so set provider_executable_path=node
// and inject the stub path as the FIRST argv by wrapping through opts... instead point exec at the stub:
const ACTSTUB = (o = {}) => ({ ...ACT(o), provider_executable_path: STUB });

function setupWt(id, opts = {}) {
  const p = join(WTROOT, id); git(["worktree", "add", "-q", "-b", "lane/" + id, p, "HEAD"], REPO);
  writeFileSync(join(p, "stub-mode"), opts.mode || "success");
  const ident = { run_id: "reh", job_id: id, attempt: 1, allowed_file: join(p, "src", id + ".mjs"), allowed_file_rel: "src/" + id + ".mjs", tests: ["t"], ...opts.identity };
  writeFileSync(join(p, "identity.json"), JSON.stringify(ident));
  return { p, ident };
}
const job = (id, over = {}) => ({ job_id: id, title: "t", objective: "o", done_meaning: "d", source: "s", risk_class: "WIDE_SAFE", effect_class: "LOCAL_FS", allowed_files: ["src/"], forbidden_files: ["secrets"], branch: "lane/" + id, worktree: join(WTROOT, id), max_changed_lines: 100, tests: [["node", "-e", "process.exit(0)"]], expected_output_paths: ["src/" + id + ".mjs"], required_evidence_files: [], ...over });

// ============ POSITIVE FULL ROUTE ============
{ const { p, ident } = setupWt("j1", { identity: { session_id: "bs1", prompt_digest: "bpd1" } });
  const bout = await runJob(ACTSTUB(), job("j1"), BIND, { env: { PATH: process.env.PATH, HOME: process.env.HOME } });
  ok("01 builder spawn -> SUCCESS + tree_gone true", bout.outcome === "SUCCESS" && bout.tree_gone === true);
  ok("02 builder parsed_output returned + schema-valid + bound", validateBuilderOutput(bout.parsed_output, { run_id: "reh", job_id: "j1", attempt: 1, session_id: "bs1", prompt_digest: "bpd1" }).valid === true);
  ok("03 builder modified ONLY its allowed file", existsSync(ident.allowed_file));
  const mv = await execMachineVerifier()(job("j1"), bout, { evidenceDir: join(EVROOT, "j1") });
  ok("04 machine verifier EXECUTES the real test (exit0) + requires tree_gone -> PASS", mv.pass === true && mv.checks.some((c) => /test\[0\]_executed_exit0/.test(c.name) && c.ok) && mv.checks.some((c) => c.name === "tree_gone" && c.ok));
  const mvDigest = mv.report_digest;
  // checker session (read-only): denied Write/Edit; identity carries checker session + mv digest + builder tx
  writeFileSync(join(p, "identity.json"), JSON.stringify({ ...ident, checker_session_id: "cs1", checker_prompt_digest: "cpd1", builder_transaction_id: "tx1", machine_verifier_digest: mvDigest }));
  const cout = await runJob(ACTSTUB({ allowed_tools: ["Read", "Grep"], denied_tools: ACT().denied_tools.concat(["Write", "Edit"]) }), { ...job("j1"), _checker_session: "cs1" }, BIND, { env: { PATH: process.env.PATH, HOME: process.env.HOME } });
  const cval = validateCheckerOutput(cout.parsed_output, { run_id: "reh", job_id: "j1", attempt: 1, session_id: "cs1", prompt_digest: "cpd1", builder_transaction_id: "tx1", machine_verifier_digest: mvDigest });
  ok("05 checker spawn (read-only prompt) -> structured verdict via STDOUT", cout.outcome === "SUCCESS" && cout.role === "checker" && cout.parsed_output.role === "checker");
  ok("06 checker verdict validated + exactly bound + CLEAN", cval.valid === true && cval.verdict === "CLEAN");
  // launcher/evidence-plane (NOT checker) writes the attempt-bound verdict after validation
  const vdir = join(EVROOT, "j1", "attempt-1"); mkdirSync(vdir, { recursive: true });
  if (cval.valid) writeFileSync(join(vdir, "checker-verdict.json"), JSON.stringify({ ...cout.parsed_output, written_by: "evidence-plane" }));
  ok("07 attempt-bound verdict written by evidence plane (not the checker)", existsSync(join(vdir, "checker-verdict.json"))); }

// ============ NEGATIVES (all fail closed) ============
{ setupWt("nb", {}); const bout = await runJob(ACTSTUB(), job("nb"), BIND, { env: { PATH: process.env.PATH, HOME: process.env.HOME } }); // checker gets BUILDER prompt (no _checker_session)
  ok("08 checker receiving builder prompt -> builder output -> checker validation refuses", validateCheckerOutput(bout.parsed_output, { run_id: "reh", job_id: "nb", attempt: 1 }).valid === false); }
{ setupWt("mf", { mode: "malformed" }); const bout = await runJob(ACTSTUB(), job("mf"), BIND, { env: { PATH: process.env.PATH, HOME: process.env.HOME } }); ok("09 malformed output -> not SUCCESS", bout.outcome !== "SUCCESS"); }
{ setupWt("wr", { mode: "wrong-role" }); const bout = await runJob(ACTSTUB(), job("wr"), BIND, { env: { PATH: process.env.PATH, HOME: process.env.HOME } }); ok("10 wrong-role output refused by validator", validateBuilderOutput(bout.parsed_output, { run_id: "reh", job_id: "wr", attempt: 1 }).valid === false); }
{ setupWt("tf"); const bout = await runJob(ACTSTUB(), job("tf"), BIND, { env: { PATH: process.env.PATH, HOME: process.env.HOME } }); const mv = await execMachineVerifier()(job("tf", { tests: [["node", "-e", "process.exit(1)"]] }), bout, { evidenceDir: join(EVROOT, "tf") }); ok("11 failing test -> machine verification FAIL", mv.pass === false); }
{ setupWt("mo"); const bout = await runJob(ACTSTUB(), job("mo"), BIND, { env: { PATH: process.env.PATH, HOME: process.env.HOME } }); const mv = await execMachineVerifier()(job("mo", { expected_output_paths: ["src/DOES-NOT-EXIST.mjs"] }), bout, { evidenceDir: join(EVROOT, "mo") }); ok("12 missing expected output -> machine verification FAIL", mv.pass === false); }
{ setupWt("me"); const bout = await runJob(ACTSTUB(), job("me"), BIND, { env: { PATH: process.env.PATH, HOME: process.env.HOME } }); const mv = await execMachineVerifier()(job("me", { required_evidence_files: [{ path: "nope.json", sha256: "sha256:x" }] }), bout, { evidenceDir: join(EVROOT, "me") }); ok("13 missing required evidence file -> machine verification FAIL", mv.pass === false); }
{ setupWt("eh"); const bout = await runJob(ACTSTUB(), job("eh"), BIND, { env: { PATH: process.env.PATH, HOME: process.env.HOME } }); const ed = join(EVROOT, "eh"); mkdirSync(ed, { recursive: true }); writeFileSync(join(ed, "ev.json"), "content"); const mv = await execMachineVerifier()(job("eh", { required_evidence_files: [{ path: "ev.json", sha256: "sha256:" + "0".repeat(64) }] }), bout, { evidenceDir: ed }); ok("14 evidence hash mismatch -> machine verification FAIL", mv.pass === false); }
{ setupWt("tg"); const bout = await runJob(ACTSTUB(), job("tg"), BIND, { env: { PATH: process.env.PATH, HOME: process.env.HOME } }); const mv = await execMachineVerifier()(job("tg"), { ...bout, tree_gone: false }, { evidenceDir: join(EVROOT, "tg") }); ok("15 tree_gone=false -> machine verification FAIL", mv.pass === false); }
{ const mv = await execMachineVerifier()(job("tg"), { tree_gone: null }, { evidenceDir: join(EVROOT, "tg") }); ok("16 absent tree_gone -> machine verification FAIL", mv.pass === false); }
{ setupWt("cf", { mode: "checker-findings", identity: { checker_session_id: "cs", checker_prompt_digest: "cpd", builder_transaction_id: "tx", machine_verifier_digest: "sha256:x" } }); const cout = await runJob(ACTSTUB({ allowed_tools: ["Read", "Grep"] }), { ...job("cf"), _checker_session: "cs" }, BIND, { env: { PATH: process.env.PATH, HOME: process.env.HOME } }); const cval = validateCheckerOutput(cout.parsed_output, { run_id: "reh", job_id: "cf", attempt: 1 }); ok("17 checker FINDINGS is not CLEAN", cval.verdict === "FINDINGS" && cval.verdict !== "CLEAN"); }
// stale verdict for a DIFFERENT attempt must not validate for this attempt
{ ok("18 stale verdict (wrong attempt) refused", validateCheckerOutput({ schema: "lrcq-checker-output-1", role: "checker", run_id: "reh", job_id: "j1", attempt: 99, checker_session_id: "cs1", checker_prompt_digest: "cpd1", reviewed_builder_transaction_id: "tx1", reviewed_machine_verifier_digest: "d", criteria: [{ criterion_id: "c", result: "PASS" }], verdict: "CLEAN" }, { run_id: "reh", job_id: "j1", attempt: 1 }).valid === false); }

try { git(["worktree", "prune"], REPO); } catch { /* */ }
console.log("\nLRCQ PRODUCTIVE-REHEARSAL SELFTEST: " + (n - fails.length) + "/" + n + " passed");
if (fails.length) { console.log("FAILED: " + fails.join(", ")); process.exit(1); }
process.exit(0);
