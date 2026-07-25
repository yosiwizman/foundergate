// FounderGate LRCQ — generate (a) all run-material files, (b) the signed-run manifest, and
// (c) the placeholder-free unsigned activation-material packet. Resolves the real provider
// executable identity MECHANICALLY (read-only sha256; NEVER executes it). No founder fill.
//
// FG-LRCQ-ACT-026: the material-packet recipe is now an EXPORTED PURE FUNCTION (buildActivationMaterialPacket)
// so the deterministic capsule generator reuses this EXACT authoritative recipe (binding the head
// deterministically) instead of duplicating it. ALL file writes + provider resolution are behind a CLI
// guard, so importing this module has ZERO side effects (no writes, no provider resolution, no exit).
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync, realpathSync } from "node:fs";
import { execFileSync } from "node:child_process";
// FG-CHK-197-02: fixed absolute executables in a minimal environment — never PATH-resolved.
import { fixedGit } from "../../../src/v8b/lrcq/assurance/fixed-executables.mjs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, resolve, relative, basename } from "node:path";
import { manifestDigest, MANIFEST_NO_ACTION_FLAGS } from "../../../src/v8b/lrcq/run-harness/run-manifest.mjs";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const SELF = fileURLToPath(import.meta.url);
const P = (p) => resolve(REPO, p);
const rel = (abs) => relative(REPO, abs);
const git = (...a) => fixedGit(["-C", REPO, ...a]);
const sha = (absPath) => "sha256:" + createHash("sha256").update(readFileSync(absPath)).digest("hex");
const write = (relPath, obj) => { const abs = P(relPath); mkdirSync(dirname(abs), { recursive: true }); writeFileSync(abs, JSON.stringify(obj, null, 2) + "\n"); return abs; };

const MAT = ".foundergate/run-materials/first-internal-5h";
const backlogRel = ".foundergate/backlog/first-real-five-hour-run-v2.json";

// ---- resolve the REAL provider executable, read-only (no execution). Only called under the CLI guard. ----
export function resolveProvider() {
  let path = ""; try { path = execFileSync("/bin/zsh", ["-lc", "command -v claude"], { encoding: "utf8" }).trim(); } catch { path = ""; }
  if (!path || !existsSync(path)) return null;
  let target = path; try { target = execFileSync("readlink", ["-f", path], { encoding: "utf8" }).trim() || path; } catch { /* */ }
  if (!existsSync(target)) target = path;
  const version = basename(target); // e.g. .../versions/2.1.215 -> "2.1.215" (mechanical, no exec)
  return { path, target, version, identity: sha(target) };
}

// ---- (c) placeholder-free unsigned activation-material packet — PURE, reused by the capsule generator ----
// `ctx` supplies the values that differ between the CLI (head placeholders, mechanically-resolved provider)
// and the capsule generator (real head, provider read from the committed+verified manifest). Everything
// else is recomputed from repo files, deterministically. This function performs NO writes.
export function buildActivationMaterialPacket(ctx) {
  const { repo = REPO, prov, manRel, manDigest, leaseManifestAbs, blastManifestAbs, backlogRel: bRel = backlogRel, runHarnessSha, runHarnessTree, reviewedRuntimeSha, reviewedRuntimeTree, lifecycleRootRel = ".foundergate/lifecycle" } = ctx;
  const Pr = (p) => resolve(repo, p);
  const shaAbs = (absPath) => "sha256:" + createHash("sha256").update(readFileSync(absPath)).digest("hex");
  const digestOf = (relPath) => shaAbs(Pr(relPath));
  const gitR = (...a) => fixedGit(["-C", repo, ...a]);
  const gcd = (() => { const d = gitR("rev-parse", "--path-format=absolute", "--git-common-dir"); return realpathSync(d); })();
  return {
    // ---- FG-LRCQ-ACT-029: this is a V4 activation PAYLOAD TEMPLATE. It confers no authority: the
    // founder-filled fields below are null until the signing ceremony, and there is no signature. ----
    schema: "lrcq-activation-4",
    signature_payload_version: "lrcq-activation-v4-signature-payload-1",
    founder_signature_algorithm: "ed25519",
    // founder-filled at the signing ceremony (null here, and null confers nothing)
    signer_key_fingerprint: null, authorization_text_digest: null, activation_nonce: null,
    // SIGNED repository / git-common-dir / lifecycle bindings (mechanically resolved, never founder-filled)
    repository_root_realpath: realpathSync(repo),
    repository_git_common_dir_realpath: gcd,
    lifecycle_root_realpath: (() => { const p = Pr(lifecycleRootRel); mkdirSync(p, { recursive: true }); return realpathSync(p); })(),
    lifecycle_contract_version: "lrcq-lifecycle-v4-1",
    // candidate bindings: evidence_commit_* is the exact frozen head; reviewed_runtime_* is the reviewed
    // production ancestor the run actually executes.
    evidence_commit_sha: runHarnessSha, evidence_commit_tree: runHarnessTree,
    reviewed_runtime_sha: reviewedRuntimeSha ?? runHarnessSha, reviewed_runtime_tree: reviewedRuntimeTree ?? runHarnessTree,
    // SIGNED run manifest (path + the exact FILE digest the launcher re-reads)
    run_manifest_path: manRel, run_manifest_digest: manDigest,
    lrcq_base_sha: "3794ec1a6f0d83b72a823bbd36622b1210b1a4c5", lrcq_base_tree: gitR("rev-parse", "3794ec1^{tree}"),
    provider_candidate_sha: "50e18e55863b4abc0f0c2ef036b790ef15001ac5", provider_candidate_tree: gitR("rev-parse", "50e18e5^{tree}"),
    run_id: "lrcq-first-internal-5h-run",
    backlog_digest: digestOf(bRel),
    // provider: the mutable alias is recorded for identity consistency; resolved_provider_target is the
    // IMMUTABLE reviewed versioned binary that actually executes.
    provider_executable_path: prov.path, resolved_provider_target: prov.target,
    provider_version: prov.version, provider_executable_identity: prov.identity,
    capability_lease_digest: shaAbs(leaseManifestAbs), blast_radius_budget_digest: shaAbs(blastManifestAbs),
    // founder-filled temporal window
    issued_epoch: null, expiry_epoch: null, hard_deadline_epoch: null,
    // SIGNED bounded limits
    max_budget_usd: 10, run_duration_s: 18000, per_job_timeout_s: 2700, max_parallel_width: 2,
    max_output_bytes: 10485760, termination_grace_s: 30,
    // SIGNED exclusions (all ten must be true or verification refuses)
    no_protected_main_merge: true, no_pr_merge: true, no_push_unless_authorized: true, no_m1: true, no_akior: true,
    no_customer_data: true, no_live_action: true, no_permission_bypass: true, no_deploy: true, no_external_comms: true,
    // ---- non-signed evidence fields (identity of the reviewed machinery) ----
    founder_signature: null, unsigned: true, confers_no_authority: true,
    assurance_control_backlog_digest: digestOf(".foundergate/backlog/assurance-control-master-v1.json"),
    policy_version: "lrcq-policy-v1",
    capability_lease_manifest_digest: shaAbs(leaseManifestAbs), blast_budget_manifest_digest: shaAbs(blastManifestAbs),
    launcher_digest: digestOf("tools/terminal0/lrcq/run-five-hour.mjs"), orchestrator_digest: digestOf("src/v8b/lrcq/run-harness/harness.mjs"),
    provider_adapter_digest: digestOf("src/v8b/lrcq/provider/real-provider.mjs"), run_manifest_module_digest: digestOf("src/v8b/lrcq/run-harness/run-manifest.mjs"),
    real_seams_digest: digestOf("src/v8b/lrcq/run-harness/real-seams.mjs"),
    controller_authority_digest: digestOf("src/v8b/lrcq/controller.mjs"),
    // V4 authority-core identity: the modules that own the founder-signature chain
    founder_key_authority_digest: digestOf("src/v8b/lrcq/assurance/founder-key-authority.mjs"),
    activation_v4_digest: digestOf("src/v8b/lrcq/assurance/activation-v4.mjs"),
    lifecycle_authority_v4_digest: digestOf("src/v8b/lrcq/assurance/lifecycle-authority-v4.mjs"),
    canonical_json_digest: digestOf("src/v8b/lrcq/assurance/canonical-json.mjs"),
    v4_legacy_projection_digest: digestOf("src/v8b/lrcq/run-harness/v4-legacy-projection.mjs"),
    supervisor_main_digest: digestOf("src/v8b/lrcq/run-harness/supervisor-main.mjs"),
    blocker_matrix_digest: "sha256:" + createHash("sha256").update(JSON.stringify(JSON.parse(readFileSync(Pr(".foundergate/backlog/assurance-control-master-v1.json"), "utf8")).items.filter((i) => i.first_internal_5h_requirement === "BLOCKER").map((i) => [i.control_id, i.status, i.evaluated_sha]).sort())).digest("hex"),
    evidence_spec_digest: digestOf("src/v8b/lrcq/evidence/evidence-spec.mjs"), evidence_anchor_digest: digestOf("src/v8b/lrcq/evidence/evidence-anchor.mjs"), evidence_verifier_digest: digestOf("src/v8b/lrcq/evidence/evidence-verifier.mjs"),
    assurance_case_digest: digestOf("src/v8b/lrcq/assurance-case/assurance-case.mjs"), memory_quarantine_digest: digestOf("src/v8b/lrcq/memory-quarantine/memory-quarantine.mjs"),
    provider_change_gate_digest: digestOf("src/v8b/lrcq/assurance/provider-change-gate.mjs"), recovery_policy_digest: digestOf("src/v8b/lrcq/reconciliation/transaction.mjs"),
    attack_refusal_digest: digestOf("src/v8b/lrcq/assurance/attack-refusal.mjs"),
    delegation_depth: 1, external_calls: 0, recipients: 0,
    unresolved_before_signature: [
      "signer_key_fingerprint (set to the ENROLLED founder key's fingerprint at signing)",
      "authorization_text_digest (sha256 of the EXACT founder-authorization bytes)",
      "activation_nonce", "issued_epoch", "expiry_epoch", "hard_deadline_epoch", "founder_signature",
      "evidence_commit_sha/tree (filled at final freeze — a commit cannot embed its own hash)",
    ],
    real_run_capability_disclosure: {
      proven_in_preparation: "The V4 authority chain is fully WIRED and FAIL-CLOSED, verified with ZERO provider/builder/checker invocation: signed activation -> governed public-key authority -> VERIFIED capability -> governed one-time consumption -> signed launch intent -> ONE-USE inherited-descriptor ephemeral-key transfer -> detached supervisor that INDEPENDENTLY re-verifies -> signed supervisor claim -> SUPERVISOR_EXECUTION capability -> provider eligibility -> spawn boundary. A complete bounded execution + teardown is proven end to end against a DETERMINISTIC stub provider through the real production CLI. V3/V2 records are refused at every new production entrypoint.",
      NOT_proven_in_preparation: "Actual productive work (a real builder session producing changes, and a real checker session returning CLEAN) is NOT exercised or proven here, because that requires invoking the real provider (Claude), which is forbidden during preparation. The FIRST place real productive capability is exercised is the founder-signed run itself.",
      founder_must_accept: "Enrolling a founder key and signing authorizes the first internal run to invoke the real provider through this wired, fail-closed machinery. Whether jobs actually COMPLETE depends on real builder + checker behavior, first observed under signature.",
    },
  };
}

// ---- CLI (guarded): the ONLY place files are written or the provider is resolved. Import = no side effects. ----
if (SELF === resolve(process.argv[1] || "")) {
  const backlog = JSON.parse(readFileSync(P(backlogRel), "utf8"));
  const jobs = backlog.jobs || backlog.items || backlog.backlog || [];
  const leaseManifest = write(MAT + "/capability-lease-manifest.json", {
    schema: "lrcq-capability-lease-manifest-1", scope: "task-scoped-single-use-per-job",
    template: { role: "builder", candidate_stack: "d873f27", effect_class: "LOCAL_FS", allowed_tools: ["Read", "Write", "Edit", "Grep"], denied_tools: ["Bash", "WebFetch", "Push", "Merge"], max_cost_usd: 5, max_files: 10, max_changed_lines: 500, max_external_calls: 0, max_delegation_depth: 1, single_use: true, uses_remaining: 1 },
    checker_lease_template: { role: "checker", read_only: true, single_use: true, uses_remaining: 1, allowed_tools: ["Read", "Grep"], denied_tools: ["Write", "Edit", "Bash", "Push", "Merge"] },
  });
  const blastManifest = write(MAT + "/blast-budget-manifest.json", {
    schema: "lrcq-blast-budget-1",
    budget: { max_files: 200, max_changed_lines: 9000, max_branches: 60, max_worktrees: 60, max_external_calls: 0, max_recipients: 0, max_dollars: 10, max_records: jobs.length, max_execution_s: 18000, max_delegation_depth: 1, max_output_bytes: 10485760 },
  });
  const setupContract = write(MAT + "/setup-contract.json", {
    schema: "lrcq-setup-contract-1", host_model: "Mac16,11", requires_all_25_steps: true,
    note: "The launcher binds the real validators to these 25 steps; a failed step blocks all later; a missing verifier fails closed.",
  });
  const mvContract = write(MAT + "/machine-verifier-contract.json", {
    schema: "lrcq-machine-verifier-contract-1",
    must_check: ["worktree_exists", "on_expected_branch", "changed_within_allowed", "none_forbidden", "within_line_budget", "has_required_tests", "evidence_present", "provider_torn_down"],
    rule: "provider SUCCESS is NOT machine verification; only an independent verifier PASS advances the job.",
  });
  const checkerContract = write(MAT + "/checker-contract.json", {
    schema: "lrcq-checker-contract-1", mandatory: true, distinct_session: true, read_only_single_use_lease: true, distinct_prompt_digest: true, runs_after_machine_verification: true,
    verdicts: ["CLEAN", "FINDINGS", "INSUFFICIENT_EVIDENCE"], undefined_output_becomes: "INSUFFICIENT_EVIDENCE", never_invents_clean: true,
  });
  const allowedTools = write(MAT + "/allowed-tools-manifest.json", { schema: "lrcq-allowed-tools-1", builder: ["Read", "Write", "Edit", "Grep"], checker: ["Read", "Grep"] });
  const deniedTools = write(MAT + "/denied-tools-manifest.json", { schema: "lrcq-denied-tools-1", all: ["Bash", "WebFetch", "Push", "Merge", "Deploy"] });

  const prov = resolveProvider();
  if (!prov) { console.error("REFUSED: could not mechanically resolve the provider executable (no claude on PATH)"); process.exit(2); }

  const evidenceRoot = ".foundergate/evidence/lrcq-assurance-factory/REAL-RUN";
  const manifest = {
    schema: "lrcq-run-manifest-1",
    repository_root: REPO,
    backlog_path: rel(P(backlogRel)), backlog_digest: sha(P(backlogRel)),
    capability_lease_manifest_path: rel(leaseManifest), capability_lease_manifest_digest: sha(leaseManifest),
    blast_budget_manifest_path: rel(blastManifest), blast_budget_manifest_digest: sha(blastManifest),
    setup_contract_path: rel(setupContract), setup_contract_digest: sha(setupContract),
    machine_verifier_contract_path: rel(mvContract), machine_verifier_contract_digest: sha(mvContract),
    checker_contract_path: rel(checkerContract), checker_contract_digest: sha(checkerContract),
    allowed_tools_manifest_path: rel(allowedTools), allowed_tools_manifest_digest: sha(allowedTools),
    denied_tools_manifest_path: rel(deniedTools), denied_tools_manifest_digest: sha(deniedTools),
    job_count: jobs.length, estimated_minutes: jobs.reduce((n, j) => n + (j.estimated_minutes || 0), 0),
    permitted_worktree_root: REPO + "-worktrees", branch_prefix: "lane/real-run-",
    evidence_root: evidenceRoot,
    recovery_state_path: evidenceRoot + "/recovery-state.json", ledger_path: evidenceRoot + "/ledger.jsonl",
    transaction_registry_path: evidenceRoot + "/transactions.jsonl", replay_stream_path: evidenceRoot + "/replay.jsonl",
    evidence_index_path: evidenceRoot + "/evidence-index.jsonl", next_safe_action_path: evidenceRoot + "/next-safe-action.txt",
    run_lock_path: evidenceRoot + "/run.lock", pause_file_path: evidenceRoot + "/PAUSE", stop_file_path: evidenceRoot + "/STOP",
    provider_executable_path: prov.path, resolved_provider_target: prov.target, provider_version: prov.version, provider_executable_identity: prov.identity,
    max_cost_usd: 10, max_parallel_width: 2, max_duration_s: 18000, per_job_timeout_s: 2700, output_cap_bytes: 10485760, termination_grace_s: 30,
  };
  for (const f of MANIFEST_NO_ACTION_FLAGS) manifest[f] = true;
  const manRel = MAT + "/run-manifest.json";
  const manAbs = write(manRel, manifest);
  // FG-LRCQ-ACT-029: bind the exact manifest FILE digest — that is what loadManifestV4 re-reads on disk.
  const manDigest = sha(manAbs);

  const packet = buildActivationMaterialPacket({
    repo: REPO, prov, manRel, manDigest,
    leaseManifestAbs: leaseManifest, blastManifestAbs: blastManifest, backlogRel,
    runHarnessSha: "FINAL_HEAD_REPLACED_AT_FREEZE", runHarnessTree: "FINAL_TREE_REPLACED_AT_FREEZE",
    reviewedRuntimeSha: git("rev-parse", "HEAD"), reviewedRuntimeTree: git("rev-parse", "HEAD^{tree}"),
  });
  const packetRel = ".foundergate/evidence/lrcq-assurance-factory/UNSIGNED_ACTIVATION_MATERIAL_PACKET.json";
  write(packetRel, packet);
  console.log("manifest digest:", manDigest.slice(0, 24), "| provider identity:", prov.identity.slice(0, 20), "| version:", prov.version, "| jobs:", jobs.length);
  console.log("wrote:", manRel, "and", packetRel);
}
