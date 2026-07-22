// FounderGate LRCQ — signed run-manifest contract. The activation record binds the exact
// digest of ONE run manifest; the manifest binds the exact path + sha256 of every file the
// run needs. Nothing is eligible for activation until every referenced file is loaded and its
// digest verified. A path without a matching digest refuses; a digest without a readable path
// refuses; ANY founder-fill placeholder refuses. No value is resolved by a human at run time.
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";

export const sha256File = (path) => "sha256:" + createHash("sha256").update(readFileSync(path)).digest("hex");
export const sha256Str = (s) => "sha256:" + createHash("sha256").update(s).digest("hex");

// (path field, digest field) pairs — every referenced file must load + match.
export const MANIFEST_PATH_DIGEST_PAIRS = [
  ["backlog_path", "backlog_digest"],
  ["capability_lease_manifest_path", "capability_lease_manifest_digest"],
  ["blast_budget_manifest_path", "blast_budget_manifest_digest"],
  ["setup_contract_path", "setup_contract_digest"],
  ["machine_verifier_contract_path", "machine_verifier_contract_digest"],
  ["checker_contract_path", "checker_contract_digest"],
  ["allowed_tools_manifest_path", "allowed_tools_manifest_digest"],
  ["denied_tools_manifest_path", "denied_tools_manifest_digest"],
];
// scalar boundary/identity/bound fields (must all be present, non-placeholder)
export const MANIFEST_SCALARS = [
  "job_count", "estimated_minutes", "repository_root", "permitted_worktree_root", "branch_prefix",
  "evidence_root", "recovery_state_path", "ledger_path", "transaction_registry_path", "replay_stream_path",
  "evidence_index_path", "next_safe_action_path", "run_lock_path", "pause_file_path", "stop_file_path",
  "provider_executable_path", "resolved_provider_target", "provider_version", "provider_executable_identity",
  "max_cost_usd", "max_parallel_width", "max_duration_s", "per_job_timeout_s", "output_cap_bytes", "termination_grace_s",
];
export const MANIFEST_NO_ACTION_FLAGS = ["no_protected_main_merge", "no_pr_merge", "no_push_unless_authorized", "no_m1", "no_akior", "no_customer_data", "no_live_action", "no_permission_bypass"];

const PLACEHOLDER = /<\s*founder|founder-fills|<fill|placeholder|TBD|TODO/i;
const isPlaceholder = (v) => typeof v === "string" && PLACEHOLDER.test(v);

// Verify a manifest object against disk. Returns { valid, refusals, loaded } where loaded maps
// each path field to its verified content (parsed JSON for .json, raw text otherwise).
export function loadAndVerifyManifest(manifest, opts = {}) {
  const refusals = []; const loaded = {};
  const R = (c, m) => { if (c) refusals.push(m); };
  if (!manifest || typeof manifest !== "object") return { valid: false, refusals: ["manifest absent"], loaded };
  const readFile = opts.readFile || ((p) => readFileSync(p, "utf8"));
  const exists = opts.exists || existsSync;
  const digestOf = opts.digestOf || sha256File;

  // no placeholders anywhere
  for (const [k, v] of Object.entries(manifest)) R(isPlaceholder(v), "placeholder in field " + k + ": " + v);

  // path<->digest symmetry + load + digest verify
  for (const [pathField, digestField] of MANIFEST_PATH_DIGEST_PAIRS) {
    const p = manifest[pathField], d = manifest[digestField];
    if (p && !d) { R(true, "path without digest: " + pathField); continue; }
    if (d && !p) { R(true, "digest without path: " + digestField); continue; }
    if (!p && !d) { R(true, "missing both " + pathField + "/" + digestField); continue; }
    if (!exists(p)) { R(true, "unreadable path: " + pathField + "=" + p); continue; }
    let actual;
    try { actual = digestOf(p); } catch (e) { R(true, "digest failed for " + pathField + ": " + (e.message || e)); continue; }
    if (actual !== d) { R(true, "digest mismatch for " + pathField + " (bound " + String(d).slice(0, 20) + "… actual " + actual.slice(0, 20) + "…)"); continue; }
    try { loaded[pathField] = /\.json$/.test(p) ? JSON.parse(readFile(p)) : readFile(p); }
    catch (e) { R(true, "load/parse failed for " + pathField + ": " + (e.message || e)); }
  }

  // scalars present + non-placeholder
  for (const s of MANIFEST_SCALARS) R(manifest[s] === undefined || manifest[s] === null || manifest[s] === "", "missing scalar " + s);
  // no-action flags all true
  for (const f of MANIFEST_NO_ACTION_FLAGS) R(manifest[f] !== true, f + " must be true");
  // provider identity must be a real sha256, not a placeholder
  R(typeof manifest.provider_executable_identity === "string" && !/^sha256:[0-9a-f]{64}$/.test(manifest.provider_executable_identity), "provider_executable_identity must be a real sha256");
  // job_count must match the loaded backlog length when available
  if (loaded.backlog_path && Array.isArray(loaded.backlog_path.jobs || loaded.backlog_path)) {
    const jobs = loaded.backlog_path.jobs || loaded.backlog_path;
    R(manifest.job_count !== jobs.length, "job_count " + manifest.job_count + " != loaded backlog length " + jobs.length);
  }
  return { valid: refusals.length === 0, refusals, loaded };
}

// Build the digest an activation record must bind for a given manifest object (stable JSON).
export function manifestDigest(manifest) { return sha256Str(JSON.stringify(manifest)); }

// The activation must bind the exact manifest digest.
export function activationBindsManifest(activation, manifest) {
  return typeof activation.run_manifest_digest === "string" && activation.run_manifest_digest === manifestDigest(manifest);
}
