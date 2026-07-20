// FounderGate LRCQ — ACT-009 PRODUCTION-ROUTE proof: identity rendered into the real prompt (no
// identity.json), worker recovers it from the prompt, emits the transport envelope, runJob parses
// it strictly. Real runJob spawn of the deterministic protocol stub. NO real Claude.
import { runJob } from "../provider/real-provider.mjs";
import { ACTIVATION_SCHEMA_VERSION } from "../provider/activation-schema.mjs";
import { buildIdentityEnvelope } from "../provider/identity-envelope.mjs";
import { validateBuilderOutput, validateCheckerOutput } from "../provider/provider-output.mjs";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log("  FAIL " + name); } else console.log("  ok   " + name); };
const HERE = dirname(fileURLToPath(import.meta.url));
const STUB = join(HERE, "../provider-tests/productive-stub.mjs");
const git = (a, cwd) => execFileSync("git", a, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
const ROOT = mkdtempSync(join(tmpdir(), "lrcq-proto-")); const EVROOT = join(ROOT, "ev"); mkdirSync(EVROOT, { recursive: true });
const REPO = join(ROOT, "repo"); mkdirSync(join(REPO, "src"), { recursive: true });
git(["init", "-q", "-b", "main"], REPO); git(["config", "user.email", "t@t"], REPO); git(["config", "user.name", "t"], REPO);
writeFileSync(join(REPO, "seed.txt"), "s"); git(["add", "-A"], REPO); git(["commit", "-q", "-m", "s"], REPO);
const WTROOT = join(ROOT, "wt"); mkdirSync(WTROOT, { recursive: true });
const DENY = ["Bash(git " + "push:*)", "Bash(git " + "merge:*)", "Bash(git checkout:*)", "Bash(git switch:*)", "Bash(gh pr " + "merge:*)", "Bash(git " + "reset --hard:*)", "--dangerously-skip-permissions"];
const ACT = (o = {}) => ({ schema_version: ACTIVATION_SCHEMA_VERSION, founder_signature: "sig", issued_epoch: 1000, expiry_epoch: 9999999999, lrcq_base_sha: "L", lrcq_base_tree: "LT", provider_candidate_sha: "P", provider_candidate_tree: "PT", backlog_digest: "d", run_id: "R", start_condition: "fa", hard_deadline_epoch: 9999999999, max_parallel_width: 2, per_job_timeout_s: 5, termination_grace_s: 1, max_output_bytes: 1048576, max_budget_usd: 5, allowed_tools: ["Read", "Write", "Edit"], denied_tools: DENY, allowed_repository: REPO, allowed_branch_prefix: "lane/", allowed_worktree_root: WTROOT, allowed_evidence_root: EVROOT, provider_executable_path: STUB, provider_version: "v", provider_executable_identity: "id", provider_mode: "manual", subscription_only: true, prohibited_env: ["ANTHROPIC_API_KEY"], prohibited_commands: ["x"], stop_conditions: ["deadline"], no_protected_main_merge: true, no_pr_merge: true, no_push_unless_authorized: true, no_m1: true, no_akior: true, no_customer_data: true, no_live_action: true, no_permission_bypass: true, ...o });
const BIND = { lrcq_base_sha: "L", lrcq_base_tree: "LT", provider_candidate_sha: "P", provider_candidate_tree: "PT", backlog_digest: "d", provider_path: STUB, provider_version: "v", provider_identity: "id", now_epoch: 2000, active_run: false, recovery_resolved: true };
const ENV = { env: { PATH: process.env.PATH, HOME: process.env.HOME } };
const wt = (id) => { const p = join(WTROOT, id); git(["worktree", "add", "-q", "-b", "lane/" + id, p, "HEAD"], REPO); writeFileSync(join(p, "stub-mode"), "success"); return p; };
const envelope = (id, over = {}) => buildIdentityEnvelope({ role: "builder", run_id: "R", job_id: id, attempt: 1, session_id: "bs-" + id, candidate_sha: "SHA", candidate_tree: "TREE", backlog_digest: "sha256:b", resolved_plan_digest: "sha256:p", branch: "lane/" + id, worktree: join(WTROOT, id), lease_id: "L-" + id, lease_digest: "sha256:l", allowed_tools_digest: "sha256:a", denied_tools_digest: "sha256:d", evidence_path: join(EVROOT, id), deadline_epoch: 9e12, session_cost_cap_usd: 0.25, ...over });
const job = (id, over = {}) => ({ job_id: id, title: "t", objective: "endurance fixture " + id, done_meaning: "d", source: "s", risk_class: "WIDE_SAFE", effect_class: "LOCAL_FS", allowed_files: ["src/" + id + ".mjs"], forbidden_files: ["secrets"], branch: "lane/" + id, worktree: join(WTROOT, id), tests: ["t"], required_evidence: ["e"], ...over });

// ---- PROTOCOL builder: identity ONLY from the rendered prompt; transport-wrapped output ----
{ const p = wt("j1"); const env = envelope("j1");
  const out = await runJob(ACT(), { ...job("j1"), role: "builder", _identity_envelope: env }, BIND, { ...ENV, transport: true, role: "builder" });
  ok("01 protocol builder via runJob -> SUCCESS (transport parsed) + cost surfaced", out.outcome === "SUCCESS" && typeof out.provider_cost_usd === "number" && out.provider_cost_usd > 0);
  ok("02 builder output recovered identity from the RENDERED PROMPT (no identity.json present)", !existsSync(join(p, "identity.json")) && out.parsed_output && out.parsed_output.run_id === "R" && out.parsed_output.job_id === "j1");
  ok("03 builder output validates + exactly bound", validateBuilderOutput(out.parsed_output, { run_id: "R", job_id: "j1", attempt: 1, session_id: "bs-j1" }).valid === true);
  ok("04 builder produced the fixture in its allowed file", existsSync(join(p, "src", "j1.mjs"))); }

// ---- identity drift: wrong run_id in the envelope -> echoed output mismatches the bind -> refused ----
{ wt("j2"); const env = envelope("j2", { run_id: "WRONG" });
  const out = await runJob(ACT(), { ...job("j2"), role: "builder", _identity_envelope: env }, BIND, { ...ENV, transport: true, role: "builder" });
  ok("05 prompt identity drift (wrong run_id) -> builder output fails bind validation", validateBuilderOutput(out.parsed_output, { run_id: "R", job_id: "j2", attempt: 1 }).valid === false); }

// ---- transport: unknown envelope from the worker -> runJob FAILED (not SUCCESS) ----
{ const p = wt("j3"); writeFileSync(join(p, "stub-mode"), "unknown-envelope");
  const out = await runJob(ACT(), { ...job("j3"), role: "builder", _identity_envelope: envelope("j3") }, BIND, { ...ENV, transport: true, role: "builder" });
  ok("06 unknown transport envelope -> FAILED (strict parser rejects)", out.outcome !== "SUCCESS"); }
{ const p = wt("j4"); writeFileSync(join(p, "stub-mode"), "malformed");
  const out = await runJob(ACT(), { ...job("j4"), role: "builder", _identity_envelope: envelope("j4") }, BIND, { ...ENV, transport: true, role: "builder" });
  ok("07 malformed transport -> FAILED", out.outcome !== "SUCCESS"); }

// ---- PROTOCOL checker: read-only, transport-wrapped verdict, bound to builder tx + mv digest ----
{ wt("c1"); const env = buildIdentityEnvelope({ role: "checker", run_id: "R", job_id: "c1", attempt: 1, session_id: "cs-c1", candidate_sha: "SHA", candidate_tree: "TREE", backlog_digest: "sha256:b", resolved_plan_digest: "sha256:p", branch: "lane/c1", worktree: join(WTROOT, "c1"), lease_id: "CL", lease_digest: "sha256:l", allowed_tools_digest: "sha256:a", denied_tools_digest: "sha256:d", evidence_path: join(EVROOT, "c1"), deadline_epoch: 9e12, session_cost_cap_usd: 0.08, builder_transaction_id: "tx-c1", machine_verifier_report_digest: "sha256:mv" });
  env.checker_session_id = "cs-c1"; env.checker_prompt_digest = "cpd-c1"; env.builder_transaction_id = "tx-c1"; env.machine_verifier_digest = "sha256:mv";
  const out = await runJob(ACT({ allowed_tools: ["Read", "Grep"] }), { ...job("c1"), role: "checker", _checker_session: "cs-c1", _identity_envelope: env }, BIND, { ...ENV, transport: true, role: "checker" });
  const cv = validateCheckerOutput(out.parsed_output, { run_id: "R", job_id: "c1", attempt: 1, builder_transaction_id: "tx-c1", machine_verifier_digest: "sha256:mv" });
  ok("08 protocol checker via runJob -> structured verdict (transport) bound + CLEAN", out.outcome === "SUCCESS" && cv.valid === true && cv.verdict === "CLEAN"); }

try { git(["worktree", "prune"], REPO); rmSync(ROOT, { recursive: true, force: true }); } catch { /* */ }
console.log("\nLRCQ PROTOCOL-ROUTE SELFTEST: " + (n - fails.length) + "/" + n + " passed");
if (fails.length) { console.log("FAILED: " + fails.join(", ")); process.exit(1); }
process.exit(0);
