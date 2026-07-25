// FounderGate LRCQ — TEST-SUPPORT body: the real provider spawn/outcome/containment matrix executed under a
// GENUINE SUPERVISOR_EXECUTION capability (FG-LRCQ-ACT-029). Runs inside v4-execution-child.mjs.
//
// Every activation handed to runJob here is the production NON-AUTHORITATIVE projection of the capability
// this process minted (projectLegacyActivationV4) — never a hand-written V2 record. The provider is the
// deterministic stub the SIGNED activation binds; no real Claude is invoked.
import { mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { runJob } from "../../../provider/real-provider.mjs";
import { projectLegacyActivationV4 } from "../../../run-harness/v4-legacy-projection.mjs";

export default async function body(cap, args) {
  const checks = [];
  const ok = (name, cond, detail) => checks.push({ name, ok: !!cond, detail: cond ? undefined : detail });
  const git = (a, cwd) => execFileSync("git", a, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();

  // ---- disposable git scaffolding inside the signed repository root ----
  const BASE = join(args.base, "prov"); mkdirSync(BASE, { recursive: true });
  const REPO = join(BASE, "repo"); mkdirSync(REPO, { recursive: true });
  git(["init", "-q", "-b", "main"], REPO); git(["config", "user.email", "t@t"], REPO); git(["config", "user.name", "t"], REPO);
  writeFileSync(join(REPO, "seed.txt"), "seed\n"); git(["add", "-A"], REPO); git(["commit", "-q", "-m", "seed"], REPO);
  const WTROOT = join(BASE, "wt"); mkdirSync(WTROOT, { recursive: true });
  const EVROOT = join(BASE, "evidence"); mkdirSync(EVROOT, { recursive: true });
  const mkWt = (id, branch, mode) => { const p = join(WTROOT, id); git(["worktree", "add", "-q", "-b", branch, p, "HEAD"], REPO); writeFileSync(join(p, "stub-mode"), mode || "success"); return p; };

  // ---- the manifest the SIGNED run_manifest_digest stands for. It may NARROW a signed limit, never widen. ----
  const MAN = (o = {}) => ({
    repository_root: REPO, branch_prefix: "lane/", permitted_worktree_root: WTROOT, evidence_root: EVROOT,
    per_job_timeout_s: 0.4, termination_grace_s: 0.2, output_cap_bytes: 1048576, max_parallel_width: 2, max_cost_usd: 5, ...o,
  });
  const LOADED = { allowed_tools_manifest_path: { builder: ["Read", "Edit", "Bash(git status:*)"], checker: ["Read", "Grep"] } };
  const ACT = (manOver = {}, role = "builder") => projectLegacyActivationV4(cap, MAN(manOver), LOADED, role, { evidenceRoot: EVROOT });
  const BIND = (o = {}) => ({
    lrcq_base_sha: cap.lrcq_base_sha, lrcq_base_tree: cap.lrcq_base_tree,
    provider_candidate_sha: cap.provider_candidate_sha, provider_candidate_tree: cap.provider_candidate_tree,
    backlog_digest: cap.backlog_digest, provider_path: cap.provider_executable_path,
    provider_version: cap.provider_version, provider_identity: cap.provider_identity,
    run_harness_candidate_sha: cap.evaluated_candidate,
    now_epoch: cap.issued_epoch + 100, active_run: false, recovery_resolved: true, ...o,
  });
  const JOB = (id, o = {}) => ({ job_id: id, risk_class: o.risk || "WIDE_SAFE", effect_class: o.eff || "LOCAL_FS", gate_trigger: o.gate || "NONE", worktree: o.worktree !== undefined ? o.worktree : mkWt(id, o.branch || ("lane/" + id), o.mode), branch: o.branch || "lane/" + id, allowed_files: o.files || ["src/x/" + id + ".mjs"], forbidden_files: o.forbidden || ["src/founder_url_drop/"], tests: ["t"], required_evidence: ["e"] });
  const run = (act, job, bind, opts) => runJob(act, job, bind, { env: { PATH: process.env.PATH, HOME: process.env.HOME }, executionCapability: cap, ...(opts || {}) });

  // ---- P0: the projection actually binds this capability, and the SIGNED ceiling wins ----
  ok("P0a the projection is non-authoritative and bound to THIS capability", ACT().authoritative === false && ACT().v4_supervisor_claim_digest === cap.supervisor_claim_digest);
  ok("P0b the projection spawns the SIGNED immutable resolved target (the stub)", ACT().provider_resolved_target === cap.resolved_provider_target);
  ok("P0c a manifest cannot WIDEN a signed limit", ACT({ output_cap_bytes: 999999999999, per_job_timeout_s: 99999 }).max_output_bytes === cap.limits.max_output_bytes && ACT({ per_job_timeout_s: 99999 }).per_job_timeout_s === cap.limits.per_job_timeout_s);
  ok("P0d a manifest MAY narrow a signed limit", ACT({ output_cap_bytes: 1024 }).max_output_bytes === 1024);

  // ---- 34: pre-spawn git identity refusal ----
  ok("34 runJob refuses a non-git worktree (ACTIVATION_REFUSED)", (await run(ACT(), JOB("gi6", { worktree: join(WTROOT, "plain2") }), BIND())).outcome === "ACTIVATION_REFUSED");

  // ---- 35-42: process / outcome with the real deterministic stub over real git worktrees ----
  { const r = await run(ACT(), JOB("s1", { mode: "success" }), BIND()); ok("35 success -> SUCCESS and tree_gone true", r.outcome === "SUCCESS" && r.tree_gone === true, r.outcome + " " + JSON.stringify(r.refusals || [])); }
  { const r = await run(ACT(), JOB("s2", { mode: "fail" }), BIND()); ok("36 nonzero exit -> FAILED", r.outcome === "FAILED", r.outcome); }
  { const r = await run(ACT(), JOB("s3", { mode: "malformed" }), BIND()); ok("37 malformed on exit0 -> FAILED (not success)", r.outcome === "FAILED", r.outcome); }
  { const r = await run(ACT(), JOB("s4", { mode: "noout" }), BIND()); ok("38 no output on exit0 -> UNKNOWN_FAILURE", r.outcome === "UNKNOWN_FAILURE", r.outcome); }
  { const r = await run(ACT({ per_job_timeout_s: 0.3 }), JOB("s5", { mode: "timeout" }), BIND()); ok("39 per-job timeout -> WORKER_TIMEOUT killed + tree_gone", r.outcome === "WORKER_TIMEOUT" && r.killed === true && r.tree_gone === true, r.outcome); }
  { const r = await run(ACT({ per_job_timeout_s: 0.3, termination_grace_s: 0.2 }), JOB("s6", { mode: "ignore-term" }), BIND()); ok("40 ignored SIGTERM -> SIGKILL escalation + tree_gone", r.kill_escalated === true && r.tree_gone === true, r.outcome); }
  { const r = await run(ACT({ per_job_timeout_s: 0.3, termination_grace_s: 0.2 }), JOB("s7", { mode: "needs-kill" }), BIND()); ok("41 needs SIGKILL -> escalated + tree_gone", r.kill_escalated === true && r.tree_gone === true, r.outcome); }
  { const r = await run(ACT({ output_cap_bytes: 1024, per_job_timeout_s: 3 }), JOB("s9", { mode: "overflow" }), BIND()); ok("42 output overflow -> OUTPUT_OVERFLOW + truncated", r.outcome === "OUTPUT_OVERFLOW" && r.stdout_bytes > 1024, r.outcome); }

  // ---- 43-44: child + grandchild REAL OS liveness ----
  { const wt = mkWt("gc1", "lane/gc1", "child"); const r = await run(ACT({ per_job_timeout_s: 0.4, termination_grace_s: 0.2 }), { ...JOB("gc1", { worktree: wt, branch: "lane/gc1" }) }, BIND());
    const gcPid = r.descendant_pids && r.descendant_pids[0];
    const gcAlive = gcPid ? (() => { try { process.kill(gcPid, 0); return true; } catch (e) { return e.code === "EPERM"; } })() : null;
    ok("43 grandchild PID recorded", Number.isInteger(gcPid), JSON.stringify(r.descendant_pids));
    ok("44 child+grandchild both gone (OS liveness, not a self-reported bool)", r.tree_gone === true && gcAlive === false); }

  // ---- 45: the run deadline during a live worker (earlier limit wins) ----
  { const t0 = Date.now(); const nowProvider = () => (Date.now() - t0 > 150 ? cap.hard_deadline_epoch + 1000 : cap.issued_epoch + 100);
    const r = await run(ACT({ per_job_timeout_s: 5 }), JOB("dl1", { mode: "timeout" }), BIND(), { nowProvider, pollMs: 30 });
    ok("45 hard deadline during worker -> RUN_DEADLINE_EXPIRED (exact)", r.outcome === "RUN_DEADLINE_EXPIRED" && r.killed === true && r.tree_gone === true, r.outcome); }

  // ---- 46-58: activation / containment refusals (each proven to be a PRE-SPAWN refusal) ----
  const refused = async (name, act, job, bind, opts) => { const r = await run(act, job, bind, opts); ok(name, r.outcome === "ACTIVATION_REFUSED" && r.started === false && r.provider_invocation === "PROVIDER_NOT_ATTEMPTED", r.outcome + " started=" + r.started); return r; };
  await refused("46 expired signed activation refused (now past the SIGNED expiry)", ACT(), JOB("a46", { worktree: join(WTROOT, "na46") }), BIND({ now_epoch: cap.expiry_epoch + 1 }));
  await refused("47 wrong provider-candidate sha refused", ACT(), JOB("a47", { worktree: join(WTROOT, "na47") }), BIND({ provider_candidate_sha: "X" }));
  await refused("48 backlog digest mismatch refused", ACT(), JOB("a48", { worktree: join(WTROOT, "na48") }), BIND({ backlog_digest: "sha256:BAD" }));
  await refused("49 worktree outside the manifest root refused", ACT(), JOB("a49", { worktree: "/tmp/other" }), BIND());
  await refused("50 path traversal refused", ACT(), JOB("a50", { worktree: WTROOT + "/../escape" }), BIND());
  await refused("51 allowed_file overlapping forbidden refused", ACT(), JOB("a51", { worktree: join(WTROOT, "na51"), files: ["src/founder_url_drop/x.mjs"], forbidden: ["src/founder_url_drop/"] }), BIND());
  await refused("52 branch outside allowed prefix refused", ACT(), JOB("a52", { worktree: join(WTROOT, "na52"), branch: "feature/x" }), BIND());
  await refused("53 active run refused", ACT(), JOB("a53", { worktree: join(WTROOT, "na53") }), BIND({ active_run: true }));
  await refused("54 unresolved recovery refused", ACT(), JOB("a54", { worktree: join(WTROOT, "na54") }), BIND({ recovery_resolved: false }));
  { const r = await refused("55 NARROW job refused at the V4 eligibility gate", ACT(), JOB("a55", { worktree: join(WTROOT, "na55"), risk: "NARROW_SENSITIVE" }), BIND());
    ok("55b that refusal is the V4 provider-eligibility gate", (r.refusals || []).some((x) => /V4_PROVIDER_INELIGIBLE/.test(x)), JSON.stringify(r.refusals)); }
  { const r = await refused("56 founder-gated job refused at the V4 eligibility gate", ACT(), JOB("a56", { worktree: join(WTROOT, "na56"), gate: "FOUNDER_GATE" }), BIND());
    ok("56b that refusal is the V4 provider-eligibility gate", (r.refusals || []).some((x) => /V4_PROVIDER_INELIGIBLE/.test(x)), JSON.stringify(r.refusals)); }
  await refused("57 live-action job refused at the adapter", ACT(), JOB("a57", { worktree: join(WTROOT, "na57"), eff: "LIVE_ACTION" }), BIND());
  { const r = await run(ACT(), JOB("a58", { mode: "success" }), BIND(), { controlSignal: () => "PAUSE" }); ok("58 pause before spawn -> TERMINATED_BY_PAUSE", r.outcome === "TERMINATED_BY_PAUSE", r.outcome); }

  // ---- V4 negatives that need a REAL capability to be meaningful ----
  { const foreign = { ...ACT(), v4_supervisor_claim_digest: "sha256:" + "0".repeat(64) };
    const r = await run(foreign, JOB("v4a", { mode: "success" }), BIND());
    ok("V1 a projection whose claim digest does NOT match this capability -> refused, zero spawn", r.outcome === "ACTIVATION_REFUSED" && r.started === false && (r.refusals || []).some((x) => /V4_PROJECTION_NOT_BOUND/.test(x)), JSON.stringify(r.refusals)); }
  { const r = await runJob(ACT(), JOB("v4b", { mode: "success" }), BIND(), { env: { PATH: process.env.PATH }, executionCapability: { ...cap } });
    ok("V2 a SHALLOW COPY of the genuine capability -> refused (brand is a WeakSet), zero spawn", r.outcome === "ACTIVATION_REFUSED" && r.started === false && (r.refusals || []).some((x) => /V4_SUPERVISOR_EXECUTION_CAPABILITY_REQUIRED/.test(x)), JSON.stringify(r.refusals)); }
  { const r = await runJob(ACT(), JOB("v4c", { mode: "success" }), BIND(), { env: { PATH: process.env.PATH } });
    ok("V3 NO capability at all -> refused, zero spawn", r.outcome === "ACTIVATION_REFUSED" && r.started === false, r.outcome); }

  return { checks, repo: REPO };
}
