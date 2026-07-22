// FounderGate LRCQ — generate the founder-readable assurance-case view (A05) from a real
// assurance case validated by assurance-case.mjs. Honest: unsupported claims never render.
import { buildAssuranceCase, validateAssuranceCase, founderView } from "../assurance-case/assurance-case.mjs";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
const HERE = dirname(fileURLToPath(import.meta.url));

const ac = buildAssuranceCase({
  candidate_sha: "FROZEN-HEAD", candidate_tree: "FROZEN-TREE", source_identity: "github.com/yosiwizman/foundergate PR#189",
  policy_version: "lrcq-policy-v1", provider_identity: "sha256:90608b5c… (real claude, read-only)", environment_identity: "Mac16,11 / AKIOR-Mac-mini",
  authorized_capability: ["WIDE_SAFE local-fs, single-use lease, blast-bounded"], required_tests: ["unit", "refusal", "recovery", "real-launch"],
  refusal_proofs: ["attack-refusal 24/24", "authority-route 14/14"], machine_verifier: { pass: true }, independent_checker: { result: "CLEAN" },
  unresolved_limitations: ["productive completion (real builder + checker CLEAN) NOT proven until the founder-signed run", "external evidence anchoring HELD (no third-party timestamp/key/storage)"],
  recovery_state: "disk-recoverable (recovery-completeness 12/12)", gate_state: "HELD_FOUNDER_GATE",
  evidence_links: [{ id: "E-suite" }, { id: "E-preflight" }, { id: "E-authority" }, { id: "E-evidence-verifier" }],
  claims: [
    { id: "c1", statement: "Exactly one sanctioned REAL execution route (stepReal collapsed)", evidence: ["E-authority"], asserts: "supporting" },
    { id: "c2", statement: "Machinery wired + fail-closed; preflight SIGNATURE-REQUIRED, zero invocation", evidence: ["E-preflight"], asserts: "supporting" },
    { id: "c3", statement: "Evidence is portable + offline-verifiable + tamper-evident", evidence: ["E-evidence-verifier"], asserts: "supporting" },
    { id: "c4", statement: "Full deterministic self-test suite green", evidence: ["E-suite"], asserts: "supporting" },
  ],
});
const v = validateAssuranceCase(ac);
if (!v.valid) { console.error("assurance case INVALID:", v.refusals); process.exit(1); }
writeFileSync(resolve(HERE, "fixtures", "assurance-case.view.json"), JSON.stringify({ valid: true, ...founderView(ac) }, null, 2) + "\n");
console.log("wrote assurance-case.view.json (valid:", v.valid, ", claims:", ac.claims.length, ")");
