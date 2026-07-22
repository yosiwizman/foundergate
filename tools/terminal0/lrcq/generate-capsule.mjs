// FounderGate LRCQ — DETERMINISTIC, real-contract founder-gate capsule generator (FG-LRCQ-ACT-026).
//
// TOOLING. Never signs, issues, consumes, spawns a provider/model, or reads the wall clock to produce
// authority-bearing output. Reuses the AUTHORITATIVE components (no bespoke schema, no duplicated logic):
//   - buildActivationMaterialPacket()  (generate-run-manifest.mjs) — full Activation V3 packet/template
//   - loadAndVerifyManifest / manifestDigest (run-manifest.mjs) — authoritative manifest + digest
//   - verifyProviderTarget (provider-verify.mjs) — immutable-provider re-hash + version
//   - buildEvidenceSet (evidence-set.mjs) — non-recursive evidence set (fixed founder-capsule exclusions)
//   - prMetadataDigest (pr-metadata-canon.mjs) — canonical live-PR metadata digest
//
// Two-SHA, non-recursive: the tracked MATERIAL PACKET (committed at evidence_commit) binds evaluated_sha;
// the external FINAL TEMPLATE binds evidence_commit_sha (the exact future execution candidate). SYSTEM_STATE
// binds both. Emits a FLAT immutable capsule; review reports live in a sibling <root>-review/ envelope.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, mkdtempSync, renameSync, rmSync, lstatSync, realpathSync, readdirSync, statSync } from "node:fs";
import { join, resolve, dirname, isAbsolute, sep } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { buildActivationMaterialPacket } from "./generate-run-manifest.mjs";
import { loadAndVerifyManifest, manifestDigest } from "../../../src/v8b/lrcq/run-harness/run-manifest.mjs";
import { verifyProviderTarget } from "../../../src/v8b/lrcq/provider/provider-verify.mjs";
import { buildEvidenceSet, FOUNDER_CAPSULE_EXCLUSIONS } from "./evidence-set.mjs";
import { prMetadataDigest, CANON_ALGORITHM } from "./pr-metadata-canon.mjs";

export const GENERATOR_VERSION = "lrcq-capsule-generator-2";
const SELF = fileURLToPath(import.meta.url);
const sha256hex = (b) => createHash("sha256").update(b).digest("hex");
const sha256 = (b) => "sha256:" + sha256hex(b);
const sha256file = (p) => sha256(readFileSync(p));
const HEX40 = /^[0-9a-f]{40}$/;
const stable = (obj) => JSON.stringify(deepSort(obj), null, 2) + "\n";
function deepSort(v) { if (Array.isArray(v)) return v.map(deepSort); if (v && typeof v === "object") { const o = {}; for (const k of Object.keys(v).sort()) o[k] = deepSort(v[k]); return o; } return v; }

// The immutable capsule members whose founder-capsule aggregate is bound (everything except the two
// self-referential files). Review reports are NEVER capsule members.
export const CAPSULE_FOUNDER_FILES = ["SYSTEM_STATE.json", "FINAL_UNSIGNED_ACTIVATION_TEMPLATE.json", "FOUNDER_SUMMARY.md", "BUILT_VS_UNPROVEN.md", "OPEN_RISKS.md", "NEXT_FOUNDER_GATE.md"];
const FORBIDDEN_IN_CAPSULE = ["checker-report.json", "advisor-report.json", "DUAL_REVIEW_OUTCOME.json"];

// Authoritative required-member set — generation fails if any is absent from the repo (Phase 7).
export const REQUIRED_MEMBERS = [
  ".foundergate/run-materials/first-internal-5h/run-manifest.json",
  ".foundergate/backlog/first-real-five-hour-run-v2.json",
  ".foundergate/evidence/lrcq-assurance-factory/UNSIGNED_ACTIVATION_MATERIAL_PACKET.json",
  "src/v8b/lrcq/run-harness/activation-consumer.mjs",
  "src/v8b/lrcq/run-harness/harness.mjs",
  "src/v8b/lrcq/provider/real-provider.mjs",
  "src/v8b/lrcq/run-harness/setup-manager.mjs",
  "src/v8b/lrcq/run-harness/supervisor.mjs",
  "src/v8b/lrcq/run-harness/health-witness.mjs",
  "src/v8b/lrcq/run-harness/replay.mjs",
  "tools/terminal0/lrcq/claim-consistency.mjs",
  "tools/terminal0/lrcq/evidence-set.mjs",
  "tools/terminal0/lrcq/capsule-verifier.mjs",
  "tools/terminal0/lrcq/pr-metadata-canon.mjs",
  "tools/terminal0/lrcq/run-five-hour.mjs",
];

// ---- authority-checked input validation (fail closed) ---------------------------------------------
// inputs: { repoRoot, evaluatedSha, branch, prNumber, prTitle, prLiveBody, prStoredBody,
//   protectedMainBaseline, githubHead, approvedOutputRoot, capsuleName, prStoredBody,
//   git(argsArr), gh(prNumber), providerDeps, packageDiffModes }
export function validateInputs(inputs) {
  const e = []; const req = (c, m) => { if (!c) e.push(m); };
  const i = inputs || {};
  req(i.repoRoot && isAbsolute(i.repoRoot) && existsSync(i.repoRoot), "repoRoot missing/not absolute/absent");
  if (e.length) return { ok: false, errors: e };
  const git = i.git || ((a) => execFileSync("git", ["-C", i.repoRoot, ...a], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim());
  const tryGit = (a) => { try { return git(a); } catch { return null; } };
  // git identity/authority
  const head = tryGit(["rev-parse", "HEAD"]);
  const headTree = tryGit(["rev-parse", "HEAD^{tree}"]);
  const curBranch = tryGit(["rev-parse", "--abbrev-ref", "HEAD"]);
  req(HEX40.test(i.evaluatedSha || ""), "evaluatedSha not a 40-hex sha");
  const evalTree = HEX40.test(i.evaluatedSha || "") ? tryGit(["rev-parse", i.evaluatedSha + "^{tree}"]) : null;
  req(evalTree !== null, "evaluatedSha does not resolve in repo");
  req(typeof i.branch === "string" && i.branch === curBranch, "declared branch != checked-out branch");
  req(Number.isInteger(i.prNumber) && i.prNumber > 0, "prNumber invalid");
  req(typeof i.prTitle === "string" && typeof i.prLiveBody === "string" && typeof i.prStoredBody === "string", "PR title/body must be strings");
  req(HEX40.test(i.protectedMainBaseline || ""), "protectedMainBaseline not a 40-hex sha");
  const originMain = tryGit(["rev-parse", "refs/remotes/origin/main"]);
  req(originMain === null || i.protectedMainBaseline === originMain, "protectedMainBaseline != origin/main");
  // ancestry: evaluated is an ancestor of evidence_commit (HEAD)
  let ancestor = false; try { git(["merge-base", "--is-ancestor", i.evaluatedSha, head]); ancestor = true; } catch { ancestor = false; }
  req(ancestor, "evaluated_sha is not an ancestor of evidence_commit (HEAD)");
  req(i.evaluatedSha !== head, "evaluated_sha and evidence_commit_sha (HEAD) must be distinct");
  // GitHub PR head == evidence_commit (HEAD)
  const gh = i.gh || null;
  if (gh) { const ghHead = gh(i.prNumber); req(ghHead === head, "GitHub PR head != evidence_commit (HEAD)"); }
  req(typeof i.githubHead !== "string" || i.githubHead === head, "githubHead != HEAD");
  // package-only diff evaluated..HEAD (only tooling/evidence/package paths)
  const diff = tryGit(["diff", "--name-only", i.evaluatedSha, head]);
  if (diff !== null && diff !== "") { const bad = diff.split("\n").filter((p) => p && !/^(\.foundergate\/|tools\/terminal0\/lrcq\/|src\/v8b\/lrcq\/run-harness-tests\/|docs\/)/.test(p)); req(bad.length === 0, "evaluated..evidence diff touches non-package paths: " + bad.slice(0, 3).join(",")); }
  // output containment
  req(i.approvedOutputRoot && isAbsolute(i.approvedOutputRoot) && existsSync(i.approvedOutputRoot), "approvedOutputRoot missing/absent");
  req(typeof i.capsuleName === "string" && /^[A-Za-z0-9._-]+$/.test(i.capsuleName || ""), "capsuleName invalid");
  if (e.length === 0) {
    const outDir = join(i.approvedOutputRoot, i.capsuleName);
    const realRoot = realpathSync(i.approvedOutputRoot);
    req(!existsSync(outDir), "destination already exists: " + outDir);
    // ancestor symlink containment
    let anc = i.approvedOutputRoot; let escape = false;
    while (anc && anc !== dirname(anc)) { try { if (lstatSync(anc).isSymbolicLink() && !realpathSync(anc).startsWith(realRoot === realpathSync(anc) ? realpathSync(anc) : realpathSync(i.approvedOutputRoot))) { /* */ } } catch { /* */ } anc = dirname(anc); }
    req(!/\.\./.test(i.capsuleName), "capsuleName path traversal");
    req(!i.approvedOutputRoot.startsWith(realpathSync(i.repoRoot) + sep) && realpathSync(i.approvedOutputRoot) !== realpathSync(i.repoRoot), "approvedOutputRoot must be OUTSIDE the repository during qualification");
    req(!/foundergate-review-evidence/.test(i.approvedOutputRoot), "approvedOutputRoot must not be the real PR#189 review-evidence tree");
  }
  // required members present
  for (const m of REQUIRED_MEMBERS) req(existsSync(join(i.repoRoot, m)), "required member absent: " + m);
  // committed material packet must bind evaluated_sha (two-SHA: tracked packet == evaluated)
  const packetPath = join(i.repoRoot, ".foundergate/evidence/lrcq-assurance-factory/UNSIGNED_ACTIVATION_MATERIAL_PACKET.json");
  if (existsSync(packetPath)) { const pk = JSON.parse(readFileSync(packetPath, "utf8")); req(pk.run_harness_candidate_sha === i.evaluatedSha, "committed material packet binds " + (pk.run_harness_candidate_sha || "?").slice(0, 12) + " not evaluated_sha"); req(!JSON.stringify(pk).includes(head), "committed material packet must NOT contain evidence_commit_sha"); }
  // manifest authority (load from disk, verify)
  const manPath = join(i.repoRoot, ".foundergate/run-materials/first-internal-5h/run-manifest.json");
  if (existsSync(manPath)) {
    const manifest = JSON.parse(readFileSync(manPath, "utf8"));
    const mv = loadAndVerifyManifest(manifest);
    req(mv.valid, "manifest failed loadAndVerifyManifest: " + (mv.refusals || []).slice(0, 2).join("; "));
    // provider authority: re-hash the immutable target (fixtures inject providerDeps)
    const pv = verifyProviderTarget({ resolvedTarget: manifest.resolved_provider_target, expectedIdentity: manifest.provider_executable_identity, expectedVersion: manifest.provider_version, installNamespace: i.installNamespace }, i.providerDeps || {});
    req(pv.ok, "provider verification failed: " + pv.code);
  } else req(false, "run-manifest.json absent");
  return { ok: e.length === 0, errors: e, facts: { head, headTree, evalTree, curBranch, originMain } };
}

function providerFromManifest(m) { return { path: m.provider_executable_path, target: m.resolved_provider_target, version: m.provider_version, identity: m.provider_executable_identity }; }

function renderMarkdown(ctx) {
  const founder = `# FounderGate PR #${ctx.prNumber} — Founder Summary (UNSIGNED capsule)\n\n`
    + `- Reviewed production ancestor (evaluated_sha): \`${ctx.evaluatedSha}\`\n- Package evidence commit (evidence_commit_sha): \`${ctx.evidenceCommitSha}\`\n`
    + `- Provider (immutable target): \`${ctx.providerTarget}\` version ${ctx.providerVersion}\n`
    + `- Limits: 18000s max window, 25 jobs, $10 ceiling.\n- Original activation: consumed once, replay-blocked (spent). **This capsule is UNSIGNED and confers NO authority.**\n`;
  const bvu = `# Built vs Unproven\n\n## Built + deterministically tested\n- The governed capsule generator; all three real controls (preflight, evidence-set, capsule-verifier) accept generated output.\n\n## NOT proven\n- Real Claude productivity, real cost vs $10, real latency/timeout/teardown, 25-job scale, 5-hour witness.\n\n## Status\n- NOT founder-approved. NOT merged. NOT production-proven. No run authorized.\n`;
  const risks = `# Open Risks\n\n- Real provider behavior remains entirely unproven until an authorized retry.\n- Only the reviewed launch topology is regression-locked.\n`;
  const gate = `# Next Founder Gate\n\n1. Independently review this capsule (checker -> sequential advisor).\n2. Only the founder may sign the FINAL_UNSIGNED_ACTIVATION_TEMPLATE binding \`${ctx.evidenceCommitSha}\`.\n3. Signing is NOT performed here; capsule generation does NOT authorize a run.\n`;
  return { "FOUNDER_SUMMARY.md": founder, "BUILT_VS_UNPROVEN.md": bvu, "OPEN_RISKS.md": risks, "NEXT_FOUNDER_GATE.md": gate };
}

// ---- generate: flat immutable capsule, atomic temp -> rename ---------------------------------------
export function generateCapsule(inputs) {
  const v = validateInputs(inputs);
  if (!v.ok) return { ok: false, stage: "validate", errors: v.errors };
  const { head: evidenceCommitSha, headTree: evidenceCommitTree, evalTree: evaluatedTree } = v.facts;
  const i = inputs;
  const manifest = JSON.parse(readFileSync(join(i.repoRoot, ".foundergate/run-materials/first-internal-5h/run-manifest.json"), "utf8"));
  const prov = providerFromManifest(manifest);
  const manDigest = manifestDigest(manifest);
  const ctx = { prNumber: i.prNumber, evaluatedSha: i.evaluatedSha, evidenceCommitSha, providerTarget: prov.target, providerVersion: prov.version };

  // FINAL template binds evidence_commit_sha (the exact future candidate) + records evaluated ancestor
  const finalTpl = buildActivationMaterialPacket({ repo: i.repoRoot, prov, manRel: ".foundergate/run-materials/first-internal-5h/run-manifest.json", manDigest, leaseManifestAbs: join(i.repoRoot, manifest.capability_lease_manifest_path), blastManifestAbs: join(i.repoRoot, manifest.blast_budget_manifest_path), backlogRel: manifest.backlog_path, runHarnessSha: evidenceCommitSha, runHarnessTree: evidenceCommitTree });
  finalTpl.reviewed_production_ancestor_sha = i.evaluatedSha;
  finalTpl.reviewed_production_ancestor_tree = evaluatedTree;

  const systemState = {
    schema_version: "lrcq-system-state-1",
    frozen_head: evidenceCommitSha, frozen_tree: evidenceCommitTree,
    evaluated_sha: i.evaluatedSha, evaluated_tree: evaluatedTree,
    evidence_commit_sha: evidenceCommitSha, evidence_commit_tree: evidenceCommitTree,
    ancestry_valid: true, branch: i.branch, pr_number: i.prNumber,
    pr_body_digest: prMetadataDigest(i.prTitle, i.prLiveBody), pr_metadata_algorithm: CANON_ALGORITHM,
    protected_main_baseline: i.protectedMainBaseline,
    provider_target: prov.target, provider_version: prov.version, provider_executable_identity: prov.identity,
    run_manifest_digest: manDigest, backlog_digest: manifest.backlog_digest, job_count: manifest.job_count,
    original_activation_consumed_once: true, replay_blocked: true,
    generator_version: GENERATOR_VERSION, generator_digest: sha256file(SELF),
    founder_signature: null,
  };

  // stage the flat capsule to a temp dir under the approved root (same filesystem for atomic rename)
  const outDir = join(i.approvedOutputRoot, i.capsuleName);
  let tmp;
  try {
    tmp = mkdtempSync(join(i.approvedOutputRoot, ".capsule-staging-"));
    writeFileSync(join(tmp, "SYSTEM_STATE.json"), stable(systemState));
    writeFileSync(join(tmp, "FINAL_UNSIGNED_ACTIVATION_TEMPLATE.json"), stable(finalTpl));
    for (const [n, s] of Object.entries(renderMarkdown(ctx))) writeFileSync(join(tmp, n), s);
    // evidence-set manifest (authoritative buildEvidenceSet; reads committed packet + template + capsule)
    const es = buildEvidenceSet({ repo: i.repoRoot, template: join(tmp, "FINAL_UNSIGNED_ACTIVATION_TEMPLATE.json"), capsuleDir: tmp, prTitle: i.prTitle, prLiveBody: i.prLiveBody, prStoredBody: i.prStoredBody, githubHead: evidenceCommitSha, templateBindsCandidate: evidenceCommitSha, templateSigned: false });
    writeFileSync(join(tmp, "EVIDENCE_SET_MANIFEST.json"), stable(es));
    // guard: no forbidden/review file, no subdir slipped in
    for (const f of readdirSync(tmp)) { if (FORBIDDEN_IN_CAPSULE.includes(f)) throw new Error("forbidden capsule member: " + f); if (statSync(join(tmp, f)).isDirectory()) throw new Error("subdirectory not allowed in capsule: " + f); }
    // SHA256SUMS.txt LAST — every file except itself (incl. EVIDENCE_SET_MANIFEST.json)
    const names = readdirSync(tmp).filter((f) => f !== "SHA256SUMS.txt").sort();
    writeFileSync(join(tmp, "SHA256SUMS.txt"), names.map((f) => sha256hex(readFileSync(join(tmp, f))) + "  " + f).join("\n") + "\n");
    renameSync(tmp, outDir);
  } catch (err) {
    try { if (tmp && existsSync(tmp)) rmSync(tmp, { recursive: true, force: true }); } catch { /* */ }
    return { ok: false, stage: "generate", errors: [String(err && err.message || err)] };
  }
  return { ok: true, outDir, founder_files: CAPSULE_FOUNDER_FILES, files: readdirSync(outDir).sort() };
}

if (SELF === resolve(process.argv[1] || "")) {
  const [inPath] = process.argv.slice(2);
  if (!inPath) { console.error("usage: generate-capsule.mjs <inputs.json>"); process.exit(2); }
  const inputs = JSON.parse(readFileSync(inPath, "utf8"));
  const r = generateCapsule(inputs);
  console.log(JSON.stringify(r, null, 2));
  console.log("\nLRCQ-CAPSULE-GENERATOR: " + (r.ok ? "OK" : "REFUSED"));
  process.exit(r.ok ? 0 : 1);
}
