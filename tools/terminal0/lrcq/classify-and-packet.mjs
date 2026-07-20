// FounderGate LRCQ — (a) add first_internal_5h_requirement to every assurance backlog item
// WITHOUT deleting existing classifications; (b) generate the COMPLETE unsigned gate packet.
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { buildUnsignedPacket } from "../../../src/v8b/lrcq/run-harness/activation-packet.mjs";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const P = (p) => resolve(REPO, p);
const sha = (p) => "sha256:" + createHash("sha256").update(readFileSync(P(p))).digest("hex");
const git = (...a) => execFileSync("git", ["-C", REPO, ...a], { encoding: "utf8" }).trim();

// ---- (a) scope classification ----
const path = ".foundergate/backlog/assurance-control-master-v1.json";
const bk = JSON.parse(readFileSync(P(path), "utf8"));
const PRE = /(supply.chain|sbom|vulnerab|privacy|policy simulat|drift|secret broker|timestamp|outside.operator|customer|paid.pilot|compliance|disclosure|attestation)/i;
function classify(it) {
  const text = (it.title + " " + it.objective).toLowerCase();
  if (it.external_proof_required === true) return "EXTERNAL_PROOF";
  if (it.activation_blocker === true && it.status === "BUILT") return "BLOCKER";
  if (it.activation_blocker === true) return "BLOCKER";
  if (PRE.test(text)) return "PRE_CUSTOMER";
  if ((it.control_id || "").startsWith("C")) return "ENTERPRISE_LATER";
  return "SUPPORTING";
}
const counts = {};
for (const it of bk.items) { if (it.first_internal_5h_requirement === undefined) it.first_internal_5h_requirement = classify(it); counts[it.first_internal_5h_requirement] = (counts[it.first_internal_5h_requirement] || 0) + 1; }
writeFileSync(P(path), JSON.stringify(bk, null, 2) + "\n");
console.log("classification counts:", JSON.stringify(counts));

// blocker-matrix digest (the set of BLOCKER ids, stable-sorted)
const blockerIds = bk.items.filter((i) => i.first_internal_5h_requirement === "BLOCKER").map((i) => i.control_id).sort();
const blockerMatrixDigest = "sha256:" + createHash("sha256").update(JSON.stringify(blockerIds)).digest("hex");

// ---- (b) complete unsigned gate packet ----
const resolved = {
  lrcq_base_sha: "3794ec1a6f0d83b72a823bbd36622b1210b1a4c5", lrcq_base_tree: git("rev-parse", "3794ec1^{tree}"),
  provider_candidate_sha: "50e18e55863b4abc0f0c2ef036b790ef15001ac5", provider_candidate_tree: git("rev-parse", "50e18e5^{tree}"),
  run_harness_candidate_sha: git("rev-parse", "HEAD"), run_harness_candidate_tree: git("rev-parse", "HEAD^{tree}"),
  assurance_control_backlog_digest: sha(path), first_real_run_backlog_digest: sha(".foundergate/backlog/first-real-five-hour-run-v1.json"),
  provider_executable_path: "<founder-fills-approved-executable-path>", provider_version: "<founder-fills>", provider_executable_identity: "<founder-fills-sha256-of-executable>",
  policy_version: "lrcq-policy-v1", capability_lease_digest: "<founder-mints-per-run>", blast_radius_budget_digest: "<founder-mints-per-run>",
};
const { packet, would_validate_when_signed, dry_run_refusals } = buildUnsignedPacket(resolved);

const gatePacket = {
  ...packet,
  // exact code-artifact digests binding the reviewed candidate
  activation_schema_digest: sha("src/v8b/lrcq/provider/activation-schema.mjs"),
  activation_v3_core_digest: sha("src/v8b/lrcq/assurance/assurance-core.mjs"),
  launcher_digest: sha("tools/terminal0/lrcq/run-five-hour.mjs"),
  orchestrator_digest: sha("src/v8b/lrcq/run-harness/harness.mjs"),
  provider_adapter_digest: sha("src/v8b/lrcq/provider/real-provider.mjs"),
  capability_lease_module_digest: sha("src/v8b/lrcq/assurance/assurance-core.mjs"),
  transaction_policy_digest: sha("src/v8b/lrcq/reconciliation/transaction.mjs"),
  reconciliation_inbox_digest: sha("src/v8b/lrcq/reconciliation/inbox.mjs"),
  replay_schema_digest: sha("src/v8b/lrcq/run-harness/replay.mjs"),
  setup_pipeline_digest: sha("src/v8b/lrcq/run-harness/setup-pipeline.mjs"),
  separation_digest: sha("src/v8b/lrcq/run-harness/separation.mjs"),
  attack_refusal_digest: sha("src/v8b/lrcq/assurance/attack-refusal.mjs"),
  first_internal_run_blocker_matrix_digest: blockerMatrixDigest,
  first_internal_run_blocker_ids: blockerIds,
  // boundaries + stop conditions (echoed for the founder)
  repository_boundary: REPO, worktree_boundary: "per-job registered worktrees only; never protected main",
  evidence_boundary: ".foundergate/evidence/lrcq-assurance-factory/<run-id>/",
  stop_conditions: ["hard_deadline", "per_job_timeout", "queue_exhaustion", "founder_gate", "unknown_classification", "pause", "stop", "blast_budget_exceeded", "checker_findings_park", "reconciliation_hold"],
  // honest scope limitations
  pre_customer_limitations: bk.items.filter((i) => i.first_internal_5h_requirement === "PRE_CUSTOMER").map((i) => i.control_id + " " + i.title),
  external_proof_required: bk.items.filter((i) => i.first_internal_5h_requirement === "EXTERNAL_PROOF").map((i) => i.control_id + " " + i.title),
  enterprise_later: bk.items.filter((i) => i.first_internal_5h_requirement === "ENTERPRISE_LATER").map((i) => i.control_id + " " + i.title),
  confers_no_authority: true,
  would_validate_when_signed, dry_run_refusals,
};
const outDir = ".foundergate/evidence/lrcq-assurance-factory";
writeFileSync(P(outDir + "/UNSIGNED_GATE_PACKET.json"), JSON.stringify(gatePacket, null, 2) + "\n");
console.log("wrote UNSIGNED_GATE_PACKET.json  founder_signature:", gatePacket.founder_signature, " would_validate_when_signed:", would_validate_when_signed, " blockers:", blockerIds.length);
