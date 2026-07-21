// FounderGate LRCQ — compose the provider-adapter (V2) activation the ONE provider route
// requires, from the founder-signed V3 activation record + the verified run manifest. This
// closes the schema seam (harness validates V3; provider adapter validates V2) WITHOUT
// modifying the PR#188 adapter/schema: the launcher composes a V2 record whose fields are all
// derived from the signed V3 record + manifest boundaries. It resolves NOTHING a founder must
// hand-fill and invokes nothing. If the signed V3 record is incomplete the composition is still
// produced but will fail validateActivation fail-closed (never a silent pass).
import { validateActivation } from "../provider/activation-schema.mjs";

// A denied-tools list that SEMANTICALLY covers every prohibited class the V2 validator checks
// (git push/merge/checkout|switch, gh pr merge, destructive reset, permission bypass).
export const SEMANTIC_DENY = ["git push", "git merge", "git checkout", "git switch", "gh pr merge", "git reset --hard", "git clean -f", "rm -rf", "--dangerously-skip-permissions", "bypassPermissions"];

export function composeAdapterActivation(v3, manifest, loaded, opts = {}) {
  const evidenceRoot = opts.evidence_root || manifest.evidence_root;
  const builderTools = (loaded && loaded.allowed_tools_manifest_path && loaded.allowed_tools_manifest_path.builder) || ["Read", "Write", "Edit", "Grep"];
  return {
    schema_version: "lrcq-activation-2",
    founder_signature: v3.founder_signature, issued_epoch: v3.issued_epoch, expiry_epoch: v3.expiry_epoch,
    lrcq_base_sha: v3.lrcq_base_sha, lrcq_base_tree: v3.lrcq_base_tree,
    provider_candidate_sha: v3.provider_candidate_sha, provider_candidate_tree: v3.provider_candidate_tree,
    backlog_digest: v3.first_real_run_backlog_digest, run_id: v3.run_id, start_condition: "founder_signed",
    hard_deadline_epoch: v3.hard_deadline_epoch,
    max_parallel_width: v3.max_parallel_width || manifest.max_parallel_width,
    per_job_timeout_s: manifest.per_job_timeout_s, termination_grace_s: manifest.termination_grace_s,
    // FG-LRCQ-ACT-012: the per-session CLI cost ceiling (--max-budget-usd) is the run-wide ledger's
    // per-session RESERVATION (opts.session_budget_usd, e.g. $0.25), NOT the full run budget. Passing
    // the whole run budget here would let a single Claude session spend the entire $10 at the CLI,
    // defeating the cumulative ceiling. Fall back to the run budget only when no reservation is supplied
    // (e.g. preflight composition, where nothing is dispatched).
    max_output_bytes: manifest.output_cap_bytes, max_budget_usd: opts.session_budget_usd || v3.max_budget_usd || manifest.max_cost_usd,
    allowed_tools: builderTools, denied_tools: SEMANTIC_DENY.slice(),
    allowed_repository: manifest.repository_root, allowed_branch_prefix: manifest.branch_prefix,
    allowed_worktree_root: manifest.permitted_worktree_root, allowed_evidence_root: evidenceRoot,
    provider_executable_path: manifest.provider_executable_path, provider_version: manifest.provider_version,
    provider_executable_identity: manifest.provider_executable_identity, provider_mode: "default", subscription_only: true,
    prohibited_env: ["ANTHROPIC_API_KEY", "AWS_SECRET_ACCESS_KEY", "GITHUB_TOKEN", "GH_TOKEN", "OPENAI_API_KEY"],
    prohibited_commands: SEMANTIC_DENY.slice(), stop_conditions: ["hard_deadline", "per_job_timeout", "pause", "stop", "queue_exhaustion", "founder_gate"],
    no_protected_main_merge: true, no_pr_merge: true, no_push_unless_authorized: true, no_m1: true, no_akior: true, no_customer_data: true, no_live_action: true, no_permission_bypass: true,
    // checker sessions get a read-only tool set (no Write/Edit)
    _checker_allowed_tools: (loaded && loaded.allowed_tools_manifest_path && loaded.allowed_tools_manifest_path.checker) || ["Read", "Grep"],
  };
}

// Compose the read-only checker-session adapter activation (distinct from the builder).
export function composeCheckerActivation(v3, manifest, loaded, opts = {}) {
  const base = composeAdapterActivation(v3, manifest, loaded, opts);
  return { ...base, allowed_tools: base._checker_allowed_tools, denied_tools: SEMANTIC_DENY.concat(["Write", "Edit"]), provider_mode: "default" };
}

// Convenience: compose + validate against the adapter contract for the given bindings.
export function composeAndValidate(v3, manifest, loaded, bindings) {
  const rec = composeAdapterActivation(v3, manifest, loaded);
  return { record: rec, ...validateActivation(rec, bindings) };
}
