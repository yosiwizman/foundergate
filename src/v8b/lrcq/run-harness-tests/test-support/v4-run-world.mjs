// FounderGate LRCQ — TEST-SUPPORT disposable RUN world (FG-LRCQ-ACT-029). Structurally test-only.
//
// Extends the disposable V4 world with a COMPLETE, digest-verified run manifest and every file it
// references, plus a disposable versioned "provider" (a deterministic stub copied to a versioned filename so
// verifyProviderTarget's non-symlink/executable/digest/version checks are exercised for real). The signed
// activation then binds run_manifest_path + run_manifest_digest, so launchDetachedSupervisorV4 and
// supervisor-main.mjs can run the production route end to end with NO caller-supplied manifest.
import { mkdirSync, writeFileSync, readFileSync, chmodSync, copyFileSync, cpSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { join, relative } from "node:path";
import { makeDisposableV4World } from "./v4-fixture.mjs";

const sha256File = (p) => "sha256:" + createHash("sha256").update(readFileSync(p)).digest("hex");

// A minimal but genuinely executable frozen backlog: each job writes one file its immutable verifier checks.
function backlogFor(count, verifierRel) {
  const jobs = [];
  for (let i = 1; i <= count; i++) {
    const id = "dj" + i;
    jobs.push({
      job_id: id, objective: "produce the deterministic fixture module for " + id,
      done_meaning: "the fixture module exists and the immutable verifier accepts it",
      risk_class: "WIDE_SAFE", effect_class: "LOCAL_FS", dependencies: [],
      allowed_files: ["src/" + id + ".mjs"], forbidden_files: ["secrets/"],
      expected_output_paths: ["src/" + id + ".mjs"],
      test_commands: [["node", verifierRel, "src/" + id + ".mjs"]],
      negative_test_commands: [], required_evidence_files: [],
      max_changed_lines: 100, max_files: 1,
      builder_cost_cap_usd: 0.25, checker_cost_cap_usd: 0.08,
      checker_criteria: ["fixture module present", "no forbidden path touched"],
      gate_trigger: "NONE", rollback_action: "remove the per-job worktree and branch",
      estimated_minutes: 2, max_attempts: 1, collision_set: [],
    });
  }
  return { schema: "lrcq-frozen-backlog-2", jobs };
}

// Build the manifest + all referenced files inside `repoRoot`. Returns the manifest facts to SIGN.
export function buildDisposableRunManifest(ctx, opts = {}) {
  const repoRoot = ctx.repoRoot;
  const runDir = join(repoRoot, "run"); mkdirSync(runDir, { recursive: true });
  const candidateRepo = join(repoRoot, "candidate"); mkdirSync(join(candidateRepo, "verifiers"), { recursive: true });
  const worktreeRoot = join(repoRoot, "worktrees"); mkdirSync(worktreeRoot, { recursive: true });
  const evidenceRoot = join(repoRoot, "run", "evidence"); mkdirSync(evidenceRoot, { recursive: true });

  // the immutable verifier the backlog's test_commands execute (outside every allowed_files path)
  const verifierAbs = join(candidateRepo, "verifiers", "fixture-verifier.mjs");
  if (opts.verifierSource) copyFileSync(opts.verifierSource, verifierAbs);
  else writeFileSync(verifierAbs, "#!/usr/bin/env node\nimport { existsSync } from 'node:fs';\nconst t = process.argv[2];\nif (!t || !existsSync(t)) { console.error('missing ' + t); process.exit(1); }\nprocess.exit(0);\n");
  const verifierRel = relative(candidateRepo, verifierAbs);

  // the disposable versioned provider target (a deterministic stub at a versioned, non-symlink path).
  // Layout mirrors the stub's own relative imports: <pstub>/provider-versions/<version> resolves
  // ../provider/* against <pstub>/provider, so the stub is copied together with that support directory.
  const pstub = join(repoRoot, "pstub");
  const versionsDir = join(pstub, "provider-versions"); mkdirSync(versionsDir, { recursive: true });
  const version = opts.providerVersion || "0.0.0-disposable";
  const target = join(versionsDir, version);
  if (opts.providerStubSource) {
    copyFileSync(opts.providerStubSource, target);
    if (opts.providerSupportDir) cpSync(opts.providerSupportDir, join(pstub, "provider"), { recursive: true });
  } else writeFileSync(target, "#!/bin/sh\necho '" + version + " (disposable)'\n");
  chmodSync(target, 0o755);
  const providerIdentity = sha256File(target);

  const jobCount = typeof opts.jobCount === "number" ? opts.jobCount : 1;
  const backlog = backlogFor(jobCount, verifierRel);
  const files = {
    backlog_path: [join(runDir, "backlog.json"), JSON.stringify(backlog, null, 2) + "\n"],
    capability_lease_manifest_path: [join(runDir, "lease.json"), JSON.stringify({ template: { allowed_tools: ["Read", "Write", "Edit"], denied_tools: ["Bash"], effect_class: "LOCAL_FS", max_cost_usd: 5, max_files: 10, max_changed_lines: 500, max_external_calls: 0, max_delegation_depth: 1 } }, null, 2) + "\n"],
    blast_budget_manifest_path: [join(runDir, "blast.json"), JSON.stringify({ budget: { max_files: 200, max_changed_lines: 9000, max_branches: 60, max_worktrees: 60, max_external_calls: 0, max_recipients: 0, max_dollars: 10, max_records: 100, max_execution_s: 18000, max_delegation_depth: 1, max_output_bytes: 10485760 } }, null, 2) + "\n"],
    setup_contract_path: [join(runDir, "setup-contract.md"), "# disposable setup contract\n"],
    machine_verifier_contract_path: [join(runDir, "mv-contract.md"), "# disposable machine-verifier contract\n"],
    checker_contract_path: [join(runDir, "checker-contract.md"), "# disposable checker contract\n"],
    allowed_tools_manifest_path: [join(runDir, "allowed-tools.json"), JSON.stringify({ builder: ["Read", "Write", "Edit"], checker: ["Read", "Grep"] }, null, 2) + "\n"],
    denied_tools_manifest_path: [join(runDir, "denied-tools.json"), JSON.stringify({ denied: ["Bash(git push:*)"] }, null, 2) + "\n"],
  };
  const manifest = {
    schema: "lrcq-run-manifest-1",
    job_count: backlog.jobs.length, estimated_minutes: 10 * backlog.jobs.length,
    repository_root: candidateRepo, permitted_worktree_root: worktreeRoot, branch_prefix: "lane/dis-",
    evidence_root: evidenceRoot,
    recovery_state_path: join(runDir, "recovery.json"), ledger_path: join(runDir, "ledger.jsonl"),
    transaction_registry_path: join(runDir, "tx.jsonl"), replay_stream_path: join(runDir, "replay.jsonl"),
    evidence_index_path: join(runDir, "evidence-index.jsonl"), next_safe_action_path: join(runDir, "next-safe-action.txt"),
    run_lock_path: join(runDir, "run.lock"), pause_file_path: join(runDir, "pause"), stop_file_path: join(runDir, "stop"),
    provider_executable_path: opts.providerAlias || target, resolved_provider_target: target,
    provider_version: version, provider_executable_identity: providerIdentity,
    max_cost_usd: 10, max_parallel_width: 1, max_duration_s: 18000, per_job_timeout_s: 60,
    output_cap_bytes: 1048576, termination_grace_s: 2,
    host_model: "Mac16,11",
    no_protected_main_merge: true, no_pr_merge: true, no_push_unless_authorized: true, no_m1: true, no_akior: true,
    no_customer_data: true, no_live_action: true, no_permission_bypass: true,
    ...(opts.manifestOverrides || {}),
  };
  for (const [field, [p, content]] of Object.entries(files)) {
    writeFileSync(p, content);
    manifest[field] = p;
    manifest[field.replace(/_path$/, "_digest")] = sha256File(p);
  }
  const manifestPath = join(runDir, "run-manifest.json");
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  // The CANDIDATE repository the per-job worktrees are created from must be a real git repo whose HEAD is
  // the SIGNED reviewed_runtime_sha — so the run executes exactly the reviewed tree, never a caller's ref.
  const cgit = (a) => execFileSync("git", ["-C", candidateRepo, ...a], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  execFileSync("git", ["-C", candidateRepo, "init", "-q", "-b", "main"], { stdio: "ignore" });
  cgit(["config", "user.email", "disposable@test"]); cgit(["config", "user.name", "disposable"]);
  cgit(["add", "-A"]); cgit(["commit", "-q", "-m", "disposable candidate"]);
  const candidateSha = cgit(["rev-parse", "HEAD"]);
  const candidateTree = cgit(["rev-parse", "HEAD^{tree}"]);
  return {
    manifestPath, manifestDigest: sha256File(manifestPath), manifest, backlog,
    candidateRepo, candidateSha, candidateTree, worktreeRoot, evidenceRoot, runDir, providerTarget: target, providerIdentity, providerVersion: version,
    // What the founder signature must cover so production reads NOTHING from a caller.
    signedOverrides: {
      run_manifest_path: relative(repoRoot, manifestPath),
      run_manifest_digest: sha256File(manifestPath),
      provider_executable_path: manifest.provider_executable_path,
      resolved_provider_target: target, provider_version: version, provider_executable_identity: providerIdentity,
      max_parallel_width: 1, per_job_timeout_s: 60, termination_grace_s: 2, max_output_bytes: 1048576,
      reviewed_runtime_sha: candidateSha, reviewed_runtime_tree: candidateTree,
    },
  };
}

// A disposable world whose SIGNED activation binds a complete, verified run manifest.
export function makeDisposableRunWorld(opts = {}) {
  let run = null;
  const world = makeDisposableV4World({
    prefix: opts.prefix || "fg-run-", nonce: opts.nonce || "run", realTemporal: true,
    run_id: opts.run_id || "lrcq-disposable-run", backlogDigest: opts.backlogDigest,
    reviewedRuntimeSha: opts.reviewedRuntimeSha,
    ...opts.worldOpts,
    prepare: (ctx) => {
      run = buildDisposableRunManifest(ctx, opts);
      return { ...run.signedOverrides, backlog_digest: run.manifest.backlog_digest, ...(opts.payloadOverrides || {}) };
    },
  });
  world.run = run;
  return world;
}
