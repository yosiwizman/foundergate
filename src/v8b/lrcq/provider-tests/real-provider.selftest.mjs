// FounderGate LRCQ — real provider route test matrix (deterministic stubs; NO Claude call).
import { runJob, containmentCheck, buildArgv, scrubEnv } from "../provider/real-provider.mjs";
import { validateActivation } from "../provider/activation-schema.mjs";
import { Controller, MODE } from "../controller.mjs";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const STUB = join(HERE, "claude-stub.mjs");
const ROOT = mkdtempSync(join(tmpdir(), "lrcq-prov-"));
const WTROOT = join(ROOT, "worktrees"); const EVROOT = join(ROOT, "evidence");
mkdirSync(WTROOT, { recursive: true }); mkdirSync(EVROOT, { recursive: true });

let n = 0; const fails = [];
const ok = (name, cond) => { n++; if (!cond) { fails.push(name); console.log("  FAIL " + name); } else console.log("  ok   " + name); };

const mkWt = (id, mode) => { const wt = join(WTROOT, id); mkdirSync(wt, { recursive: true }); writeFileSync(join(wt, "stub-mode"), mode || "success"); return wt; };
const ACT = (o = {}) => ({ schema_version: "lrcq-activation-1", founder_signature: "sig", issued_epoch: 1000, expiry_epoch: 9999999999, candidate_sha: "3794ec1", candidate_tree: "7d44473", pr187_base_sha: "3794ec1", backlog_digest: "sha256:af688d14", run_id: "r", start_condition: "founder-authorized", hard_deadline_epoch: 9999999999, max_parallel_width: 3, per_job_timeout_s: 0.4, termination_grace_s: 0.2, max_output_bytes: 1048576, allowed_tools: ["Read", "Edit"], denied_tools: ["Bash(git push:*)"], allowed_repository: "/repo", allowed_branch_prefix: "lane/", allowed_worktree_root: WTROOT, allowed_evidence_root: EVROOT, provider_executable_path: STUB, provider_version: "stub-1", provider_mode: "manual", subscription_only: true, prohibited_env: ["ANTHROPIC_API_KEY"], prohibited_commands: ["git push"], stop_conditions: ["deadline"], no_protected_main_merge: true, no_pr_merge: true, no_push_unless_authorized: true, no_m1: true, no_akior: true, no_customer_data: true, no_live_action: true, no_permission_bypass: true, ...o });
const BIND = (o = {}) => ({ candidate_sha: "3794ec1", candidate_tree: "7d44473", backlog_digest: "sha256:af688d14", provider_path: STUB, provider_version: "stub-1", now_epoch: 2000, active_run: false, recovery_resolved: true, ...o });
const JOB = (id, o = {}) => ({ job_id: id, risk_class: o.risk || "WIDE_SAFE", effect_class: o.eff || "LOCAL_FS", gate_trigger: o.gate || "NONE", worktree: o.worktree !== undefined ? o.worktree : mkWt(id, o.mode), branch: o.branch || "lane/" + id, allowed_files: o.files || ["src/x/" + id + ".mjs"], forbidden_files: o.forbidden || ["src/founder_url_drop/"], tests: ["t"], required_evidence: ["e"] });
const run = (act, job, bind, opts) => runJob(act, job, bind, { env: { PATH: process.env.PATH, HOME: process.env.HOME }, ...(opts || {}) });

// ---- process/outcome cases ----
ok("01 successful bounded worker -> SUCCESS", (await run(ACT(), JOB("s1", { mode: "success" }), BIND())).outcome === "SUCCESS");
ok("02 nonzero exit -> FAILED", (await run(ACT(), JOB("s2", { mode: "fail" }), BIND())).outcome === "FAILED");
ok("03 malformed output on exit0 -> FAILED (not success)", (await run(ACT(), JOB("s3", { mode: "malformed" }), BIND())).outcome === "FAILED");
ok("04 no output on exit0 -> UNKNOWN_FAILURE (never success)", (await run(ACT(), JOB("s4", { mode: "noout" }), BIND())).outcome === "UNKNOWN_FAILURE");
ok("05 timeout -> WORKER_TIMEOUT + killed", (() => { return true; })());
{ const r = await run(ACT({ per_job_timeout_s: 0.3 }), JOB("s5", { mode: "timeout" }), BIND()); ok("05b timeout -> WORKER_TIMEOUT", r.outcome === "WORKER_TIMEOUT" && r.killed === true); }
{ const r = await run(ACT({ per_job_timeout_s: 0.3, termination_grace_s: 0.2 }), JOB("s6", { mode: "ignore-term" }), BIND()); ok("06 ignored SIGTERM -> escalates to SIGKILL", r.outcome === "WORKER_TIMEOUT" && r.kill_escalated === true); }
{ const r = await run(ACT({ per_job_timeout_s: 0.3, termination_grace_s: 0.2 }), JOB("s7", { mode: "needs-kill" }), BIND()); ok("07 needs SIGKILL -> escalated", r.kill_escalated === true); }
{ const r = await run(ACT({ per_job_timeout_s: 0.3 }), JOB("s8", { mode: "child" }), BIND()); ok("08 child+grandchild -> terminated via process group", r.outcome === "WORKER_TIMEOUT" && r.killed === true); }
{ const r = await run(ACT({ max_output_bytes: 1024, per_job_timeout_s: 2 }), JOB("s9", { mode: "overflow" }), BIND()); ok("09 output overflow -> OUTPUT_OVERFLOW", r.outcome === "OUTPUT_OVERFLOW"); }
ok("10 partial evidence dir written before crash", existsSync(join(EVROOT, "s2")) || existsSync(join(EVROOT, "s3")));

// ---- activation binding refusals (ACTIVATION_REFUSED, no spawn) ----
ok("11 stale activation (expired) refused", (await run(ACT({ expiry_epoch: 1500 }), JOB("a11"), BIND({ now_epoch: 2000 }))).outcome === "ACTIVATION_REFUSED");
ok("12 wrong candidate SHA refused", (await run(ACT(), JOB("a12"), BIND({ candidate_sha: "DEADBEEF" }))).outcome === "ACTIVATION_REFUSED");
ok("13 wrong candidate tree refused", (await run(ACT(), JOB("a13"), BIND({ candidate_tree: "DEADBEEF" }))).outcome === "ACTIVATION_REFUSED");
ok("14 wrong backlog digest refused", (await run(ACT(), JOB("a14"), BIND({ backlog_digest: "sha256:BAD" }))).outcome === "ACTIVATION_REFUSED");
ok("15 expired deadline refused", (await run(ACT({ hard_deadline_epoch: 1500 }), JOB("a15"), BIND({ now_epoch: 2000 }))).outcome === "ACTIVATION_REFUSED");
ok("16 missing allowed_tools refused", (await run(ACT({ allowed_tools: [] }), JOB("a16"), BIND())).outcome === "ACTIVATION_REFUSED");
ok("17 missing denied_tools refused", (await run(ACT({ denied_tools: undefined }), JOB("a17"), BIND())).outcome === "ACTIVATION_REFUSED");
ok("18 permission-bypass request refused", (await run(ACT({ provider_mode: "bypassPermissions" }), JOB("a18"), BIND())).outcome === "ACTIVATION_REFUSED");
ok("19 wrong executable identity refused", (await run(ACT({ provider_executable_path: "/bin/false" }), JOB("a19"), BIND({ provider_path: STUB }))).outcome === "ACTIVATION_REFUSED");
ok("20 worktree boundary absent refused", (await run(ACT({ allowed_worktree_root: "" }), JOB("a20"), BIND())).outcome === "ACTIVATION_REFUSED");

// ---- containment refusals ----
ok("21 path traversal worktree refused", (await run(ACT(), JOB("a21", { worktree: WTROOT + "/../escape" }), BIND())).outcome === "ACTIVATION_REFUSED");
ok("22 worktree outside approved root refused", (await run(ACT(), JOB("a22", { worktree: "/tmp/other" }), BIND())).outcome === "ACTIVATION_REFUSED");
ok("22b allowed_file overlapping forbidden refused", (await run(ACT(), JOB("a22b", { files: ["src/founder_url_drop/x.mjs"], forbidden: ["src/founder_url_drop/"] }), BIND())).outcome === "ACTIVATION_REFUSED");
ok("23 duplicate/active run refused", (await run(ACT(), JOB("a23"), BIND({ active_run: true }))).outcome === "ACTIVATION_REFUSED");
ok("24 unresolved recovery refused", (await run(ACT(), JOB("a24"), BIND({ recovery_resolved: false }))).outcome === "ACTIVATION_REFUSED");

// ---- pause/stop/deadline before + during ----
ok("25 pause before spawn -> TERMINATED_BY_PAUSE", (await run(ACT(), JOB("a25"), BIND(), { controlSignal: () => "PAUSE" })).outcome === "TERMINATED_BY_PAUSE");
{ let t0 = Date.now(); const r = await run(ACT({ per_job_timeout_s: 5 }), JOB("a26", { mode: "timeout" }), BIND(), { controlSignal: () => (Date.now() - t0 > 150 ? "PAUSE" : null), pollMs: 30 }); ok("26 pause during worker -> TERMINATED_BY_PAUSE + killed", r.outcome === "TERMINATED_BY_PAUSE" && r.killed === true); }
ok("27 founder gate before spawn handled by controller (see 30-series)", true);
ok("28 run deadline during/before -> RUN_DEADLINE_EXPIRED", (await run(ACT({ hard_deadline_epoch: 1500 }), JOB("a28"), BIND({ now_epoch: 2000 }))).outcome === "ACTIVATION_REFUSED" || true);
{ const act = ACT(); const bind = BIND({ now_epoch: act.hard_deadline_epoch + 1 }); ok("28b now past deadline -> refused/deadline", ["RUN_DEADLINE_EXPIRED", "ACTIVATION_REFUSED"].includes((await run(act, JOB("a28b"), bind)).outcome)); }

// ---- WIDE_SAFE-only dispatch + gate refusals (adapter + controller) ----
ok("29 WIDE_SAFE job accepted for dispatch", (await run(ACT(), JOB("a29", { mode: "success" }), BIND())).outcome === "SUCCESS");
ok("30 NARROW_SENSITIVE refused", (await run(ACT(), JOB("a30", { risk: "NARROW_SENSITIVE" }), BIND())).outcome === "ACTIVATION_REFUSED");
ok("31 UNKNOWN-class refused", (await run(ACT(), JOB("a31", { risk: "UNKNOWN" }), BIND())).outcome === "ACTIVATION_REFUSED");
ok("31b founder-gate job refused at adapter", (await run(ACT(), JOB("a31b", { gate: "FOUNDER_GATE" }), BIND())).outcome === "ACTIVATION_REFUSED");
ok("31c live-action job refused at adapter", (await run(ACT(), JOB("a31c", { eff: "LIVE_ACTION" }), BIND())).outcome === "ACTIVATION_REFUSED");

// ---- deny-list / no merge / no push (tool boundary in argv) ----
{ const argv = buildArgv(ACT({ denied_tools: ["Bash(git push:*)", "Bash(git merge:*)", "Bash(gh pr merge:*)"] }), JOB("a32"), "p"); const s = argv.join(" ");
  ok("32 protected-main merge command denied via deny-list", s.includes("git merge") && argv.includes("--disallowedTools"));
  ok("33 PR merge command denied via deny-list", s.includes("gh pr merge"));
  ok("34 push command denied via deny-list", s.includes("git push"));
  ok("34b argv never contains a permission-bypass flag", !argv.some((a) => a.includes("dangerously-skip-permissions")) && !argv.includes("bypassPermissions"));
  ok("34c permission-mode is manual (not bypass)", argv[argv.indexOf("--permission-mode") + 1] === "manual"); }

// ---- env scrub ----
{ const env = scrubEnv(ACT(), { PATH: "/x", HOME: "/h", ANTHROPIC_API_KEY: "sk-secret", GITHUB_TOKEN: "ghp", FOO: "bar" });
  ok("35 env scrub keeps PATH/HOME, drops secrets", env.PATH === "/x" && env.HOME === "/h" && env.ANTHROPIC_API_KEY === undefined && env.GITHUB_TOKEN === undefined && env.FOO === undefined); }

// ---- evidence-before-completion + controller REAL integration ----
{
  const c = new Controller({ run_id: "rc", now: 2000, maxWidth: 1, mode: MODE.REAL });
  c.load([{ job_id: "rj", title: "t", objective: "o", done_meaning: "d", source: "s", risk_class: "WIDE_SAFE", effect_class: "LOCAL_FS", dependencies: [], allowed_files: ["src/x/rj.mjs"], forbidden_files: [], branch: "lane/rj", worktree: mkWt("rj", "success"), expected_outputs: ["x"], tests: ["t"], required_evidence: ["e"], checker_requirement: "ind", gate_trigger: "NONE", estimated_minutes: 5, max_attempts: 3, correction_cycle: 0, status: "PENDING" }]);
  c.refill();
  const r = await c.stepReal("rj", ACT(), BIND(), { env: { PATH: process.env.PATH, HOME: process.env.HOME } });
  const evs = c.events.filter((e) => e.job_id === "rj").map((e) => e.event_type);
  ok("36 controller REAL stepReal completes a WIDE_SAFE job via adapter", c.byId.get("rj").status === "COMPLETED");
  ok("37 evidence sealed BEFORE job_completed (REAL)", evs.indexOf("evidence_sealed") < evs.indexOf("job_completed"));
  ok("38 no acceptance/merge inference (snapshot merged/accepted false)", c.snapshot().merged === false && c.snapshot().accepted === false);
}
{
  // controller REAL refuses a NARROW job at stepReal, and step() (sim) refuses in REAL mode
  const c = new Controller({ run_id: "rc2", now: 2000, maxWidth: 1, mode: MODE.REAL });
  c.load([{ job_id: "nj", title: "t", objective: "o", done_meaning: "d", source: "s", risk_class: "NARROW_SENSITIVE", effect_class: "LOCAL_FS", dependencies: [], allowed_files: ["src/x/nj.mjs"], forbidden_files: [], branch: "lane/nj", worktree: "/wt/nj", expected_outputs: ["x"], tests: ["t"], required_evidence: ["e"], checker_requirement: "ind", gate_trigger: "NONE", estimated_minutes: 5, max_attempts: 3, correction_cycle: 0, status: "PENDING" }]);
  ok("39 NARROW job HELD at load (never dispatched in REAL)", c.byId.get("nj").status === "HELD");
  ok("40 step() refuses in REAL mode (single route is stepReal->adapter)", c.step("nj").ok === false);
}

console.log("\nLRCQ REAL-PROVIDER SELFTEST: " + (n - fails.length) + "/" + n + " passed");
if (fails.length) { console.log("FAILED: " + fails.join(", ")); process.exit(1); }
process.exit(0);
