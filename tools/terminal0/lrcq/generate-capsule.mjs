// FounderGate LRCQ — DETERMINISTIC, NON-RECURSIVE founder-gate capsule generator (FG-LRCQ-ACT-026).
//
// This is TOOLING. It never signs, issues, consumes, spawns a provider, or reads the wall clock to
// produce authority-bearing output. Given an explicit input contract it deterministically emits the 9
// capsule artifacts to an OUTPUT DIRECTORY (atomic temp -> rename), or fails closed leaving no partial.
//
// Two-SHA model (non-recursive):
//   evaluated_sha       — the reviewed production/tooling commit whose files are digest-bound.
//   evidence_commit_sha — the package-only commit that will CONTAIN the tracked material packet.
// The tracked MATERIAL PACKET binds evaluated_sha and NEVER its own containing commit (that would be
// self-referential). The external FINAL TEMPLATE binds evidence_commit_sha as the exact future
// execution candidate. SYSTEM_STATE binds BOTH and asserts ancestry.
//
// Reuses (never duplicates): pr-metadata-canon (prMetadataDigest/rawDigest/CANON_ALGORITHM),
// evidence-set canon() (non-recursive digest). All hashing is sha256 of file bytes or canonical body.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, mkdtempSync, mkdirSync, rmSync, renameSync, lstatSync, readdirSync, realpathSync } from "node:fs";
import { join, resolve, dirname, basename, sep, isAbsolute } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { prMetadataDigest, rawDigest, CANON_ALGORITHM } from "./pr-metadata-canon.mjs";
import { canon } from "./evidence-set.mjs";

export const GENERATOR_VERSION = "lrcq-capsule-generator-1";
const SELF = fileURLToPath(import.meta.url);

const sha256hex = (buf) => createHash("sha256").update(buf).digest("hex");
const sha256 = (buf) => "sha256:" + sha256hex(buf);
const sha256file = (p) => sha256(readFileSync(p));
const HEX40 = /^[0-9a-f]{40}$/;
const SHA256 = /^sha256:[0-9a-f]{64}$/;

// Deterministic, key-sorted JSON (human readable). Independent of construction order.
function deepSort(v) {
  if (Array.isArray(v)) return v.map(deepSort);
  if (v && typeof v === "object") { const o = {}; for (const k of Object.keys(v).sort()) o[k] = deepSort(v[k]); return o; }
  return v;
}
export function stableStringify(obj) { return JSON.stringify(deepSort(obj), null, 2) + "\n"; }

// ---- input contract + fail-closed validation ------------------------------------------------------
// inputs: {
//   repoRoot, evaluatedSha, evaluatedTree, evidenceCommitSha, evidenceCommitTree, branch, prNumber,
//   prTitle, prBody, protectedMainBaseline, runManifest, digestSources:{field:relpath},
//   committedMembers:{name:relpath}, activationIdentity, consumedOnce, replayBlocked,
//   rawEvidenceDigest, git(argsArr,cwd)  (optional injected git)
// }
export function validateInputs(inputs) {
  const e = [];
  const req = (c, m) => { if (!c) e.push(m); };
  const i = inputs || {};
  req(i.repoRoot && isAbsolute(i.repoRoot) && existsSync(i.repoRoot), "repoRoot missing/not absolute/not present");
  req(HEX40.test(i.evaluatedSha || ""), "evaluatedSha not a 40-hex sha");
  req(HEX40.test(i.evaluatedTree || ""), "evaluatedTree not a 40-hex tree");
  req(HEX40.test(i.evidenceCommitSha || ""), "evidenceCommitSha not a 40-hex sha");
  req(HEX40.test(i.evidenceCommitTree || ""), "evidenceCommitTree not a 40-hex tree");
  req(i.evaluatedSha !== i.evidenceCommitSha, "evaluated_sha and evidence_commit_sha must be DISTINCT");
  req(typeof i.branch === "string" && i.branch.length > 0, "branch missing");
  req(Number.isInteger(i.prNumber) && i.prNumber > 0, "prNumber missing/invalid");
  req(typeof i.prTitle === "string", "prTitle must be a string");
  req(typeof i.prBody === "string", "prBody must be a string");
  req(HEX40.test(i.protectedMainBaseline || ""), "protectedMainBaseline not a 40-hex sha");
  req(SHA256.test(i.rawEvidenceDigest || ""), "rawEvidenceDigest not a sha256 digest");
  req(SHA256.test(i.activationIdentity || ""), "activationIdentity not a sha256 digest");
  req(i.consumedOnce === true, "consumedOnce must be true (original activation is spent)");
  req(i.replayBlocked === true, "replayBlocked must be true");
  // manifest / provider immutability
  const m = i.runManifest || {};
  req(m && typeof m === "object", "runManifest missing");
  req(m.job_count === 25, "runManifest.job_count must be 25");
  req(m.max_cost_usd === 10, "runManifest.max_cost_usd must be 10");
  req(m.max_duration_s === 18000, "runManifest.max_duration_s must be 18000");
  req(typeof m.per_job_timeout_s === "number" && m.per_job_timeout_s > 0, "runManifest.per_job_timeout_s missing");
  req(typeof m.max_parallel_width === "number" && m.max_parallel_width > 0, "runManifest.max_parallel_width missing");
  req(SHA256.test(m.provider_executable_identity || ""), "provider_executable_identity not a sha256");
  req(typeof m.provider_version === "string" && m.provider_version.length > 0, "provider_version missing");
  // immutable target required: must be a versioned path, NOT a mutable alias
  req(typeof m.resolved_provider_target === "string" && /\/versions\/[^/]+$/.test(m.resolved_provider_target),
    "resolved_provider_target must be an immutable /versions/<v> path (a mutable alias is refused)");
  req(!(m.provider_executable_path && m.resolved_provider_target && m.provider_executable_path === m.resolved_provider_target && !/\/versions\//.test(m.resolved_provider_target)),
    "resolved_provider_target must not equal a mutable alias");
  req(typeof m.backlog_path === "string" && /first-real-five-hour-run-v2\.json$/.test(m.backlog_path), "manifest backlog_path not v2");
  req(SHA256.test(m.backlog_digest || ""), "manifest backlog_digest not a sha256");
  // cross-checks (fail closed on mismatch, never silently recompute-over)
  if (m.backlog_path && existsSync(join(i.repoRoot, m.backlog_path))) {
    req(sha256file(join(i.repoRoot, m.backlog_path)) === m.backlog_digest, "backlog_digest mismatch: manifest value != on-disk backlog hash");
  }
  const rmPath = join(i.repoRoot, ".foundergate/run-materials/first-internal-5h/run-manifest.json");
  if (i.expectRunManifestDigest !== undefined) req(existsSync(rmPath) && sha256file(rmPath) === i.expectRunManifestDigest, "run-manifest digest mismatch: expected != on-disk hash");
  if (i.expectPrBodyDigest !== undefined) req(prMetadataDigest(i.prTitle, i.prBody) === i.expectPrBodyDigest, "PR metadata digest mismatch (stale PR body): expected != canonical(live)");
  // digest sources present + no traversal
  const ds = i.digestSources || {};
  req(Object.keys(ds).length > 0, "digestSources empty (digests must be recomputed, never copied)");
  for (const [f, rel] of Object.entries(ds)) {
    if (typeof rel !== "string" || rel.includes("..") || isAbsolute(rel)) { e.push("digestSource path unsafe: " + f); continue; }
    if (!existsSync(join(i.repoRoot, rel))) e.push("digestSource file missing: " + rel);
  }
  const cm = i.committedMembers || {};
  for (const [n, rel] of Object.entries(cm)) {
    if (typeof rel !== "string" || rel.includes("..") || isAbsolute(rel)) { e.push("committedMember path unsafe: " + n); continue; }
    if (!existsSync(join(i.repoRoot, rel))) e.push("committedMember file missing: " + rel);
  }
  // ancestry: evaluated_sha must be an ancestor of evidence_commit_sha
  if (e.length === 0) {
    const git = i.git || ((a, cwd) => execFileSync("git", a, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim());
    let ancestor = false;
    try { git(["merge-base", "--is-ancestor", i.evaluatedSha, i.evidenceCommitSha], i.repoRoot); ancestor = true; } catch { ancestor = false; }
    req(ancestor, "invalid ancestry: evaluated_sha is not an ancestor of evidence_commit_sha");
  }
  return { ok: e.length === 0, errors: e };
}

function recomputeDigests(repoRoot, digestSources) {
  const out = {};
  for (const [field, rel] of Object.entries(digestSources)) out[field] = sha256file(join(repoRoot, rel));
  return out;
}

function providerAndBounds(m) {
  return {
    provider_executable_path: m.provider_executable_path,
    resolved_provider_target: m.resolved_provider_target,
    provider_version: m.provider_version,
    provider_executable_identity: m.provider_executable_identity,
    run_duration_s: m.max_duration_s,
    per_job_timeout_s: m.per_job_timeout_s,
    max_parallel_width: m.max_parallel_width,
    max_budget_usd: m.max_cost_usd,
    termination_grace_s: m.termination_grace_s ?? null,
    max_output_bytes: m.output_cap_bytes ?? null,
    no_protected_main_merge: true, no_pr_merge: true, no_push_unless_authorized: true,
    no_m1: true, no_akior: true, no_customer_data: true, no_live_action: true, no_permission_bypass: true,
  };
}

const SAFETY = { founder_signature: null, unsigned: true, issued_epoch: null, expiry_epoch: null, hard_deadline_epoch: null, consumed: false, confers_no_authority: true };

// (1) MATERIAL PACKET — binds evaluated_sha; NEVER contains evidence_commit_sha.
export function buildMaterialPacket(inputs) {
  const m = inputs.runManifest;
  const digests = recomputeDigests(inputs.repoRoot, inputs.digestSources);
  return {
    schema_version: "lrcq-activation-3",
    ...SAFETY,
    run_id: null,
    run_harness_candidate_sha: inputs.evaluatedSha,
    run_harness_candidate_tree: inputs.evaluatedTree,
    run_manifest_path: ".foundergate/run-materials/first-internal-5h/run-manifest.json",
    run_manifest_digest: sha256file(join(inputs.repoRoot, ".foundergate/run-materials/first-internal-5h/run-manifest.json")),
    backlog_path: m.backlog_path,
    backlog_digest: m.backlog_digest,
    job_count: m.job_count,
    ...providerAndBounds(m),
    ...digests,
    generator_version: GENERATOR_VERSION,
    binds: "evaluated_sha (production candidate); this tracked packet never binds its own containing commit",
  };
}

// (3) SYSTEM_STATE — binds evaluated_sha AND evidence_commit_sha + ancestry + live PR metadata digest.
export function buildSystemState(inputs) {
  const m = inputs.runManifest;
  return {
    schema_version: "lrcq-system-state-1",
    frozen_head: inputs.evidenceCommitSha,            // capsule-verifier binds live HEAD == evidence commit
    frozen_tree: inputs.evidenceCommitTree,
    evaluated_sha: inputs.evaluatedSha,
    evaluated_tree: inputs.evaluatedTree,
    evidence_commit_sha: inputs.evidenceCommitSha,
    evidence_commit_tree: inputs.evidenceCommitTree,
    ancestry_valid: true,
    branch: inputs.branch,
    pr_number: inputs.prNumber,
    pr_body_digest: prMetadataDigest(inputs.prTitle, inputs.prBody),
    pr_metadata_algorithm: CANON_ALGORITHM,
    protected_main_baseline: inputs.protectedMainBaseline,
    provider_target: m.resolved_provider_target,
    provider_version: m.provider_version,
    provider_executable_identity: m.provider_executable_identity,
    run_manifest_digest: sha256file(join(inputs.repoRoot, ".foundergate/run-materials/first-internal-5h/run-manifest.json")),
    backlog_digest: m.backlog_digest,
    job_count: m.job_count,
    original_activation_identity: inputs.activationIdentity,
    original_activation_consumed_once: inputs.consumedOnce,
    replay_blocked: inputs.replayBlocked,
    raw_run_evidence_digest: inputs.rawEvidenceDigest,
    generator_version: GENERATOR_VERSION,
    generator_digest: sha256file(SELF),
    founder_signature: null,
  };
}

// (4) FINAL UNSIGNED TEMPLATE — binds evidence_commit_sha as the exact future candidate.
export function buildFinalTemplate(inputs) {
  const m = inputs.runManifest;
  return {
    schema_version: "lrcq-activation-3",
    ...SAFETY,
    run_id: null,
    run_harness_candidate_sha: inputs.evidenceCommitSha,
    run_harness_candidate_tree: inputs.evidenceCommitTree,
    reviewed_production_ancestor_sha: inputs.evaluatedSha,
    reviewed_production_ancestor_tree: inputs.evaluatedTree,
    run_manifest_path: ".foundergate/run-materials/first-internal-5h/run-manifest.json",
    run_manifest_digest: sha256file(join(inputs.repoRoot, ".foundergate/run-materials/first-internal-5h/run-manifest.json")),
    backlog_path: m.backlog_path,
    backlog_digest: m.backlog_digest,
    job_count: m.job_count,
    ...providerAndBounds(m),
    generator_version: GENERATOR_VERSION,
    binds: "evidence_commit_sha (exact future execution candidate a signature would authorize); UNSIGNED",
  };
}

// (8) EVIDENCE-SET MANIFEST — non-recursive; excludes itself; digest over canonical body sans digest.
export function buildEvidenceSetManifest(inputs, capsuleFilesForHash) {
  const committed = {};
  for (const [n, rel] of Object.entries(inputs.committedMembers || {})) committed[n] = { path: rel, sha256: sha256file(join(inputs.repoRoot, rel)) };
  const capsule = {};
  for (const [name, buf] of Object.entries(capsuleFilesForHash)) capsule[name] = sha256(buf); // hash the FINAL bytes of each capsule file (excluding the manifest + SHA256SUMS)
  const body = {
    schema_version: "lrcq-evidence-set-3",
    evaluated_candidate_sha: inputs.evaluatedSha,
    evaluated_tree: inputs.evaluatedTree,
    evidence_commit_sha: inputs.evidenceCommitSha,
    evidence_commit_tree: inputs.evidenceCommitTree,
    committed_artifacts: committed,
    capsule_artifacts: capsule,
    exclusions: ["EVIDENCE_SET_MANIFEST.json (self)", "SHA256SUMS.txt (aggregate of the rest)"],
    non_recursive: true,
  };
  const evidence_set_digest = sha256(Buffer.from(canon(body), "utf8"));
  return { ...body, evidence_set_digest };
}

// (4-7) deterministic markdown — rendered from structured inputs; invents no claims.
function renderMarkdown(inputs) {
  const m = inputs.runManifest;
  const founder = `# FounderGate PR #${inputs.prNumber} — Founder Summary (UNSIGNED capsule)\n\n`
    + `- Reviewed production ancestor (evaluated_sha): \`${inputs.evaluatedSha}\`\n`
    + `- Package evidence commit (evidence_commit_sha): \`${inputs.evidenceCommitSha}\`\n`
    + `- Branch: \`${inputs.branch}\`  PR: #${inputs.prNumber}\n`
    + `- Provider (immutable target): \`${m.resolved_provider_target}\` version ${m.provider_version}\n`
    + `- Limits: ${m.max_duration_s}s max window, ${m.job_count} jobs, $${m.max_cost_usd} ceiling, width ${m.max_parallel_width}, per-job ${m.per_job_timeout_s}s.\n`
    + `- Original activation: consumed once, replay-blocked (spent). This capsule confers NO authority.\n`
    + `- **This capsule is UNSIGNED. It does not authorize a run. A run requires a new founder signature.**\n`;
  const bvu = `# Built vs Unproven\n\n## Built + deterministically tested\n`
    + `- Linked-worktree first-job worktree correction (evaluated_sha).\n- Deterministic capsule generation (this generator).\n`
    + `\n## NOT yet exercised / NOT proven\n`
    + `- Real Claude productivity, real per-session cost vs $${m.max_cost_usd}, real latency/timeout/teardown.\n`
    + `- Full 25-job scale + 5-hour wall-clock witness.\n`
    + `\n## Status\n- NOT founder-approved. NOT merged. NOT production-proven. No run has been authorized.\n`;
  const risks = `# Open Risks\n\n`
    + `- Only the linked-worktree launch topology is regression-locked (submodule/bare/network untested).\n`
    + `- The founder-gate package is machine-generated; correctness rests on this generator + verifiers + independent review.\n`
    + `- Real provider behavior remains entirely unproven until an authorized retry.\n`;
  const gate = `# Next Founder Gate\n\n`
    + `1. Independently review this capsule (fresh checker -> sequential advisor).\n`
    + `2. If accepted, the founder — and only the founder — may sign the FINAL_UNSIGNED_ACTIVATION_TEMPLATE binding \`${inputs.evidenceCommitSha}\`.\n`
    + `3. Signing is NOT performed here. Generator qualification does NOT authorize a run.\n`;
  return { "FOUNDER_SUMMARY.md": founder, "BUILT_VS_UNPROVEN.md": bvu, "OPEN_RISKS.md": risks, "NEXT_FOUNDER_GATE.md": gate };
}

// SHA256SUMS.txt — generated LAST; bare-hex + relative filename; sorted; excludes itself.
function renderSha256Sums(fileBytesByName) {
  const names = Object.keys(fileBytesByName).filter((n) => n !== "SHA256SUMS.txt").sort();
  return names.map((n) => sha256hex(fileBytesByName[n]) + "  " + n).join("\n") + "\n";
}

// Orchestrator: validate -> build all -> atomic temp dir -> write SHA256SUMS last -> rename. Fail closed.
export function generateCapsule(inputs, outDir) {
  const v = validateInputs(inputs);
  if (!v.ok) return { ok: false, stage: "validate", errors: v.errors };
  if (!outDir || !isAbsolute(outDir)) return { ok: false, stage: "validate", errors: ["outDir must be absolute"] };
  // reject symlink-escaping output parent
  const parent = dirname(outDir);
  if (!existsSync(parent)) return { ok: false, stage: "validate", errors: ["output parent does not exist: " + parent] };
  try { if (lstatSync(outDir).isSymbolicLink()) return { ok: false, stage: "validate", errors: ["outDir is a symlink"] }; } catch { /* not present yet: fine */ }
  if (existsSync(outDir)) return { ok: false, stage: "validate", errors: ["outDir already exists (refusing to overwrite): " + outDir] };

  // build JSON artifacts (byte-exact)
  const files = {};
  files["UNSIGNED_ACTIVATION_MATERIAL_PACKET.json"] = Buffer.from(stableStringify(buildMaterialPacket(inputs)), "utf8");
  files["SYSTEM_STATE.json"] = Buffer.from(stableStringify(buildSystemState(inputs)), "utf8");
  files["FINAL_UNSIGNED_ACTIVATION_TEMPLATE.json"] = Buffer.from(stableStringify(buildFinalTemplate(inputs)), "utf8");
  const md = renderMarkdown(inputs);
  for (const [n, s] of Object.entries(md)) files[n] = Buffer.from(s, "utf8");
  // evidence-set manifest hashes the FINAL bytes of every capsule file EXCEPT itself + SHA256SUMS
  const manifest = buildEvidenceSetManifest(inputs, files);
  files["EVIDENCE_SET_MANIFEST.json"] = Buffer.from(stableStringify(manifest), "utf8");
  // SHA256SUMS LAST — over every file above (excludes itself)
  files["SHA256SUMS.txt"] = Buffer.from(renderSha256Sums(files), "utf8");

  // atomic: write to temp dir, then rename into place only after all files are written
  let tmp;
  try {
    tmp = mkdtempSync(join(tmpdir(), "fg-capsule-"));
    for (const [n, buf] of Object.entries(files)) writeFileSync(join(tmp, n), buf);
    renameSync(tmp, outDir);
  } catch (err) {
    try { if (tmp && existsSync(tmp)) rmSync(tmp, { recursive: true, force: true }); } catch { /* */ }
    return { ok: false, stage: "write", errors: [String(err && err.message || err)] };
  }
  return { ok: true, outDir, files: Object.keys(files).sort() };
}

// CLI: node generate-capsule.mjs <inputs.json> <outDir>   (inputs.json is a deterministic input file)
if (SELF === resolve(process.argv[1] || "")) {
  const [inPath, outDir] = process.argv.slice(2);
  if (!inPath || !outDir) { console.error("usage: generate-capsule.mjs <inputs.json> <outDir>"); process.exit(2); }
  const inputs = JSON.parse(readFileSync(inPath, "utf8"));
  const r = generateCapsule(inputs, resolve(outDir));
  console.log(JSON.stringify(r, null, 2));
  console.log("\nLRCQ-CAPSULE-GENERATOR: " + (r.ok ? "OK" : "REFUSED"));
  process.exit(r.ok ? 0 : 1);
}
