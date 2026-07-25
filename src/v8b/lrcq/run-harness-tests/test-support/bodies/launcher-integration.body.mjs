// FounderGate LRCQ — TEST-SUPPORT body: the INTEGRATED launcher path (FG-LRCQ-ACT-009..013, migrated to V4
// by FG-LRCQ-ACT-029) executed under a GENUINE SUPERVISOR_EXECUTION capability. Drives the EXACT production
// entry (executeSignedRunV4 -> buildRealCfgV4 -> setupManager creates real worktrees -> runHarness ->
// makeRealDispatch renders the identity envelope + parses the CLI transport envelope -> execMachineVerifier
// runs the immutable verifier -> real checker route -> run-wide ledger -> teardown) with a deterministic
// protocol-faithful STUB (NEVER real Claude).
import { mkdirSync, writeFileSync, existsSync, readFileSync, copyFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { executeSignedRunV4, buildRealCfgV4, makeCounters } from "../../../../../../tools/terminal0/lrcq/run-five-hour.mjs";

export default async function bodyFn(cap, args, ctx) {
  const checks = [];
  const ok = (name, cond, detail) => checks.push({ name, ok: !!cond, detail: cond ? undefined : detail });
  const git = (a, cwd) => execFileSync("git", a, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  const SRCREPO = args.srcRepo, STUB = args.stub;

  const BASE = join(args.base, "int"); mkdirSync(BASE, { recursive: true });
  const REPO = join(BASE, "repo"); mkdirSync(join(REPO, "tools/terminal0/lrcq/verifiers"), { recursive: true });
  copyFileSync(join(SRCREPO, "tools/terminal0/lrcq/verifiers/fixture-verifier.mjs"), join(REPO, "tools/terminal0/lrcq/verifiers/fixture-verifier.mjs"));
  git(["init", "-q", "-b", "main"], REPO); git(["config", "user.email", "t@t"], REPO); git(["config", "user.name", "t"], REPO);
  git(["add", "-A"], REPO); git(["commit", "-q", "-m", "seed+verifier"], REPO);
  const CAND = git(["rev-parse", "HEAD"], REPO);
  const WTROOT = join(BASE, "worktrees"); mkdirSync(WTROOT, { recursive: true });
  const RUNROOT = join(BASE, "run"); mkdirSync(RUNROOT, { recursive: true });

  const v2 = JSON.parse(readFileSync(join(SRCREPO, ".foundergate/backlog/first-real-five-hour-run-v2.json"), "utf8"));
  const jobs3 = v2.jobs.slice(0, 3).map((j) => ({ ...j, dependencies: [] }));
  const manifest = {
    host_model: "Mac16,11", max_parallel_width: 2, max_cost_usd: 10,
    repository_root: REPO, branch_prefix: "lane/real-run-", permitted_worktree_root: WTROOT,
    evidence_root: "ev", per_job_timeout_s: 8, termination_grace_s: 1, output_cap_bytes: 1048576,
    provider_executable_path: STUB, provider_version: cap.provider_version, provider_executable_identity: cap.provider_identity,
    resolved_provider_target: STUB,
    ledger_path: "l.jsonl", recovery_state_path: "r.json", transaction_registry_path: "tx.jsonl",
    replay_stream_path: "rp.jsonl", evidence_index_path: "ei.jsonl", next_safe_action_path: "nsa.txt",
    run_lock_path: "run.lock", pause_file_path: "PAUSE", stop_file_path: "STOP",
  };
  const loaded = {
    capability_lease_manifest_path: { template: { allowed_tools: ["Read", "Write", "Edit"], denied_tools: ["Bash(git push:*)", "Bash(git merge:*)", "--dangerously-skip-permissions"], effect_class: "LOCAL_FS", max_cost_usd: 0.25, max_files: 10, max_changed_lines: 500, max_external_calls: 0, max_delegation_depth: 1 } },
    blast_budget_manifest_path: { budget: { max_files: 200, max_changed_lines: 9000, max_branches: 60, max_worktrees: 60, max_external_calls: 0, max_recipients: 0, max_dollars: 10, max_records: 100, max_execution_s: 18000, max_delegation_depth: 1, max_output_bytes: 10485760 } },
    allowed_tools_manifest_path: { builder: ["Read", "Write", "Edit", "Grep"], checker: ["Read", "Grep"] },
    backlog_path: { jobs: jobs3 },
  };
  const man = { manifest, loaded, root: RUNROOT };
  const exec = { git, repoRoot: REPO, candidateRef: CAND };

  // ---- 1. the SIGNED run drives the integrated launcher path end to end with the stub ----
  const counters = makeCounters();
  const result = await executeSignedRunV4(cap, ctx.signedActivation, man, counters, exec);
  const R = result.jobResults || {};
  const states = Object.values(R).map((r) => r.state);
  ok("01 integrated signed run is ready (executeSignedRunV4 -> runHarness)", result.ready === true, JSON.stringify(result.refused));
  ok("02 real worktrees were created by the launcher (not asserted booleans)", result.worktrees_created === 3, String(result.worktrees_created));
  ok("03 all 3 jobs COMPLETED through the integrated launcher + orchestrator + real-checker route", states.length === 3 && states.every((s) => s === "COMPLETED"), JSON.stringify(states));
  ok("04 the provider actually ran (dispatch + machineVerifier + checker invoked, all via the stub)", counters.c.dispatch >= 3 && counters.c.machineVerifier >= 3 && counters.c.checker >= 3, JSON.stringify(counters.c));
  ok("05 the run reported a truthful VERIFIED_PRODUCTIVE_RUN outcome", result.outcome_status === "VERIFIED_PRODUCTIVE_RUN" && result.productive_jobs_completed === 3, result.outcome_status);
  ok("06 launcher tore down every worktree it created (tree gone)", [0, 1, 2].every((i) => !existsSync(join(WTROOT, cap.run_id, jobs3[i].job_id))));
  ok("07 the durable transaction registry was written by the integrated run", existsSync(join(RUNROOT, "tx.jsonl")) && /SEALED|DISPATCHED/.test(readFileSync(join(RUNROOT, "tx.jsonl"), "utf8")));

  // ---- 2. the cfg the launcher builds carries the CAPABILITY as authority, not the record ----
  { const cfg = buildRealCfgV4(cap, ctx.signedActivation, manifest, loaded, RUNROOT, makeCounters());
    ok("08 buildRealCfgV4 puts the genuine capability on the cfg", cfg.executionCapability === cap);
    ok("09 the cfg's activation record is the NON-AUTHORITATIVE projection", cfg.activation.authoritative === false && cfg.activation.founder_signature === "NON_AUTHORITATIVE_V4_PROJECTION");
    ok("10 the cfg's run/deadline/limits derive from SIGNED facts", cfg.run_id === cap.run_id && cfg.deadlineEpoch === cap.hard_deadline_epoch && cfg.lease_digest === cap.capability_lease_digest); }

  // ---- 3. NEGATIVE: a projection not bound to this capability creates ZERO worktrees ----
  { const c2 = makeCounters();
    const before = existsSync(join(WTROOT, "FOREIGN-RUN"));
    const badCap = { ...cap };  // shallow copy: unbranded, so the harness gate refuses
    const r2 = await executeSignedRunV4(badCap, ctx.signedActivation, man, c2, exec).catch((e) => ({ ready: false, threw: String(e && e.message) }));
    ok("11 a SHALLOW-COPIED capability refuses (not ready)", r2.ready !== true, JSON.stringify(r2.refused || r2.threw));
    ok("12 that refusal invoked NO provider/checker/machineVerifier", (c2.c.dispatch || 0) === 0 && (c2.c.checker || 0) === 0 && (c2.c.machineVerifier || 0) === 0);
    ok("13 that refusal created no foreign worktree tree", before === existsSync(join(WTROOT, "FOREIGN-RUN"))); }

  try { git(["worktree", "prune"], REPO); } catch { /* */ }
  return { checks };
}
