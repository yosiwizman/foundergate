#!/usr/bin/env node
// FounderGate PR #189 — non-recursive EVIDENCE-SET manifest builder + verifier (FG-LRCQ finalization).
// Binds every material artifact presented to the founder by DIGEST so a fresh checker + separate advisor
// can reference ONE evidence_set_digest. Non-recursive: the manifest hashes named artifacts but NEVER
// itself. Head-agnostic: the frozen head is read from git at build/verify time, never hard-coded.
// This script writes ONLY the out-of-tree manifest path it is given; it verifies read-only.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve, join, relative } from "node:path";
import { prMetadataDigest, rawDigest, CANON_ALGORITHM } from "./pr-metadata-canon.mjs";

const sha256 = (buf) => "sha256:" + createHash("sha256").update(buf).digest("hex");
const sha256file = (p) => sha256(readFileSync(p));
const git = (repo, ...a) => execFileSync("git", ["-C", repo, ...a], { encoding: "utf8" }).trim();

// canonical serialization (sorted keys) so the digest is stable and order-independent.
// Exported (behavior-preserving) so the deterministic capsule generator reuses this exact
// canonicalization instead of duplicating it (FG-LRCQ-ACT-026 tooling lane).
export function canon(v) { if (Array.isArray(v)) return "[" + v.map(canon).join(",") + "]"; if (v && typeof v === "object") return "{" + Object.keys(v).sort().map((k) => JSON.stringify(k) + ":" + canon(v[k])).join(",") + "}"; return JSON.stringify(v === undefined ? null : v); }

function hashDir(dir) {
  const files = [];
  const walk = (d) => { for (const e of readdirSync(d)) { const p = join(d, e); if (statSync(p).isDirectory()) walk(p); else files.push(p); } };
  walk(dir);
  files.sort();
  const map = {}; for (const f of files) map[relative(dir, f)] = sha256file(f);
  return { map, aggregate: sha256(canon(map)) };
}

// The material the founder package binds. Paths are relative to the repo root (committed) or absolute
// (out-of-tree template/capsule). Missing REQUIRED artifacts fail closed.
export function buildEvidenceSet(opts) {
  const repo = opts.repo;
  const head = git(repo, "rev-parse", "HEAD");
  const tree = git(repo, "rev-parse", "HEAD^{tree}");
  const rel = (p) => resolve(repo, p);
  const committed = {
    run_manifest: ".foundergate/run-materials/first-internal-5h/run-manifest.json",
    backlog: ".foundergate/backlog/first-real-five-hour-run-v2.json",
    activation_packet: ".foundergate/evidence/lrcq-assurance-factory/UNSIGNED_ACTIVATION_MATERIAL_PACKET.json",
    act_matrix: ".foundergate/evidence/lrcq-assurance-factory/ACT_009_013_MATRIX.json",
    hand_burden: ".foundergate/evidence/lrcq-assurance/founder-hand-burden.json",
    incident: ".foundergate/evidence/lrcq-assurance-factory/stale-review-incident.json",
    lane_contract: ".foundergate/evidence/lrcq-assurance-factory/finalization-lane-contract.json",
    metadata_binding_lane_contract: ".foundergate/evidence/lrcq-assurance-factory/metadata-binding-lane-contract.json",
    metadata_binding_incident: ".foundergate/evidence/lrcq-assurance-factory/metadata-binding-incident.json",
    coverage_correction: ".foundergate/evidence/lrcq-assurance-factory/coverage-correction.json",
    control_plane_acceptance_matrix: ".foundergate/evidence/lrcq-assurance-factory/control-plane-acceptance-matrix.json",
    activation_consumer: "src/v8b/lrcq/run-harness/activation-consumer.mjs",
    supervisor_module: "src/v8b/lrcq/run-harness/supervisor.mjs",
    health_witness: "src/v8b/lrcq/run-harness/health-witness.mjs",
    capsule_verifier: "tools/terminal0/lrcq/capsule-verifier.mjs",
    evidence_set_tool: "tools/terminal0/lrcq/evidence-set.mjs",
    pr_metadata_canon: "tools/terminal0/lrcq/pr-metadata-canon.mjs",
    pr_metadata_canon_selftest: "src/v8b/lrcq/run-harness-tests/pr-metadata-canon.selftest.mjs",
  };
  const committed_digests = {};
  for (const [k, p] of Object.entries(committed)) { const abs = rel(p); if (!existsSync(abs)) throw new Error("missing committed artifact: " + p); committed_digests[k] = { path: p, sha256: sha256file(abs) }; }

  const manifest = JSON.parse(readFileSync(rel(committed.run_manifest), "utf8"));
  const packet = JSON.parse(readFileSync(rel(committed.activation_packet), "utf8"));

  const template_digest = existsSync(opts.template) ? sha256file(opts.template) : null;
  const capsule = existsSync(opts.capsuleDir) ? hashDir(opts.capsuleDir) : { map: {}, aggregate: null };
  const template_json = existsSync(opts.template) ? JSON.parse(readFileSync(opts.template, "utf8")) : {};

  // FG-LRCQ metadata binding: bind the EXACT live GitHub PR body via the ONE canonicalizer, which treats
  // GitHub trailing-newline / line-ending normalization as equivalent while preserving substantive content.
  const pr_metadata = (opts.prTitle != null) ? {
    algorithm: CANON_ALGORITHM,
    raw_live_body_digest: rawDigest(opts.prLiveBody || ""),
    raw_stored_body_digest: rawDigest(opts.prStoredBody || ""),
    canonical_live_metadata_digest: prMetadataDigest(opts.prTitle, opts.prLiveBody || ""),
    canonical_stored_metadata_digest: prMetadataDigest(opts.prTitle, opts.prStoredBody || ""),
    canonical_equal: prMetadataDigest(opts.prTitle, opts.prLiveBody || "") === prMetadataDigest(opts.prTitle, opts.prStoredBody || ""),
    note: "raw_live != raw_stored only by GitHub trailing-newline normalization; the canonical digests are equal and authenticate the exact live GitHub body. Any SUBSTANTIVE change (character/blank-line/link/number/SHA/order) changes the canonical digest (see pr-metadata-canon.selftest).",
  } : null;

  const body = {
    schema: "lrcq-evidence-set-2",
    evaluated_candidate_sha: head,
    evaluated_tree: tree,
    github_pr_head: opts.githubHead || null,
    pr_metadata,
    five_hour_contract: {
      run_duration_s_max: template_json.run_duration_s ?? null,
      exactly_18000: template_json.run_duration_s === 18000,
      per_job_timeout_s: template_json.per_job_timeout_s ?? null,
      enforced_by: "src/v8b/lrcq/assurance/assurance-core.mjs validateActivationV3 (run_duration_s in (0,18000], max_budget_usd in (0,10]); per-job timeout cannot extend the immutable run deadline; one-time-use activation blocks replay/new window",
      is_maximum_window_not_promise: true,
    },
    activation_template: { path: opts.template, digest: template_digest, binds_candidate: opts.templateBindsCandidate || null, founder_signature_present: opts.templateSigned === true },
    run_manifest_digest_canonical: packet.run_manifest_digest || null,
    backlog_digest: manifest.backlog_digest || null,
    job_count: manifest.job_count || null,
    cost_ceiling_usd: manifest.max_cost_usd || null,
    committed_artifacts: committed_digests,
    founder_capsule: { dir: opts.capsuleDir, files: capsule.map, aggregate_digest: capsule.aggregate },
    checker_report_digest: opts.checkerReportDigest || null,
    advisor_report_digest: opts.advisorReportDigest || null,
    exclusions: ["the evidence_set_digest field itself (non-recursive)", "out-of-tree fresh review reports (bound separately by digest once produced)"],
    offline_verification: "node tools/terminal0/lrcq/evidence-set.mjs verify <this-manifest> — recomputes every listed digest from git HEAD + the named files and fails closed on any mismatch",
  };
  const evidence_set_digest = sha256(canon(body));
  return { ...body, evidence_set_digest };
}

export function verifyEvidenceSet(repo, manifestPath) {
  const m = JSON.parse(readFileSync(manifestPath, "utf8"));
  const problems = [];
  const head = git(repo, "rev-parse", "HEAD"), tree = git(repo, "rev-parse", "HEAD^{tree}");
  if (m.evaluated_candidate_sha !== head) problems.push("candidate SHA drift: manifest " + m.evaluated_candidate_sha + " vs HEAD " + head);
  if (m.evaluated_tree !== tree) problems.push("tree drift");
  for (const [k, v] of Object.entries(m.committed_artifacts || {})) { const abs = resolve(repo, v.path); if (!existsSync(abs)) { problems.push("missing " + v.path); continue; } if (sha256file(abs) !== v.sha256) problems.push("digest mismatch: " + v.path); }
  if (m.founder_capsule && m.founder_capsule.dir && existsSync(m.founder_capsule.dir)) {
    const cur = hashDir(m.founder_capsule.dir);
    if (cur.aggregate !== m.founder_capsule.aggregate_digest) problems.push("capsule aggregate digest mismatch (files added/removed/altered)");
  } else if (m.founder_capsule && m.founder_capsule.aggregate_digest) { problems.push("capsule dir missing at verify time: " + (m.founder_capsule && m.founder_capsule.dir)); }
  if (m.activation_template && m.activation_template.path && existsSync(m.activation_template.path)) { if (sha256file(m.activation_template.path) !== m.activation_template.digest) problems.push("activation template digest mismatch"); }
  if (m.activation_template && m.activation_template.founder_signature_present === true) problems.push("activation template is SIGNED — evidence set must bind an UNSIGNED template");
  // FG-LRCQ metadata binding: the canonical live and stored PR-metadata digests MUST be equal (the whole
  // point of the correction) and the recorded equality flag must agree; a substantive drift breaks this.
  if (m.pr_metadata) {
    if (m.pr_metadata.canonical_live_metadata_digest !== m.pr_metadata.canonical_stored_metadata_digest) problems.push("canonical live/stored PR-metadata digests differ (substantive metadata drift)");
    if (m.pr_metadata.canonical_equal !== true) problems.push("pr_metadata.canonical_equal is not true");
    if (m.pr_metadata.algorithm !== CANON_ALGORITHM) problems.push("pr_metadata canonicalization algorithm mismatch");
  } else { problems.push("evidence set is missing the pr_metadata canonical binding"); }
  // Five-hour contract must be bound at exactly 18000s and cost ceiling present.
  if (!m.five_hour_contract || m.five_hour_contract.exactly_18000 !== true || m.five_hour_contract.run_duration_s_max !== 18000) problems.push("five-hour contract not bound at exactly 18000s");
  if (m.cost_ceiling_usd !== 10) problems.push("cost ceiling not bound at $10");
  if (m.job_count !== 25) problems.push("job count not bound at 25");
  // recompute the non-recursive digest
  const { evidence_set_digest, ...body } = m;
  if (sha256(canon(body)) !== evidence_set_digest) problems.push("evidence_set_digest does not match the bound body (tampered manifest)");
  return { valid: problems.length === 0, problems, evaluated_candidate_sha: head, evidence_set_digest };
}

// CLI
if (process.argv[1] && resolve(process.argv[1]).endsWith("evidence-set.mjs")) {
  const [mode, ...rest] = process.argv.slice(2);
  const REPO = resolve(new URL("../../..", import.meta.url).pathname);
  if (mode === "verify") {
    const r = verifyEvidenceSet(REPO, rest[0]);
    console.log(JSON.stringify(r, null, 2));
    console.log("\nEVIDENCE-SET: " + (r.valid ? "VALID" : "INVALID"));
    process.exit(r.valid ? 0 : 1);
  } else { console.error("usage: evidence-set.mjs verify <manifest.json>   (build is invoked programmatically at freeze)"); process.exit(2); }
}
