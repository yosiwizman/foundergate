// FounderGate LRCQ — Portable Open Evidence Format v1 (B13).
// A canonical, deterministic, self-describing evidence package that can be verified WITHOUT the
// originating runtime. Canonicalization = JSON with recursively sorted keys (stable digests).
// Unsupported claims (a claim with no backing evidence link) FAIL validation.
import { createHash } from "node:crypto";

export const EVIDENCE_SPEC_VERSION = "foundergate-evidence-1";

export const EVIDENCE_REQUIRED = [
  "spec_version", "candidate_sha", "candidate_tree", "source_identity", "policy_version",
  "provider_identity", "model_identifier", "tool_versions", "actions", "refusals", "tests",
  "machine_verifier", "checker", "findings", "limitations", "gate_state", "signatures",
  "classification", "issued_epoch", "expiry_epoch",
];
export const EVIDENCE_CLASSIFICATIONS = ["private", "disclosure"];

// Deterministic canonical serialization: sort object keys recursively; arrays preserve order.
export function canonicalize(value) {
  if (Array.isArray(value)) return "[" + value.map(canonicalize).join(",") + "]";
  if (value && typeof value === "object") {
    return "{" + Object.keys(value).sort().map((k) => JSON.stringify(k) + ":" + canonicalize(value[k])).join(",") + "}";
  }
  return JSON.stringify(value === undefined ? null : value);
}
export function packageDigest(pkg) { return "sha256:" + createHash("sha256").update(canonicalize(pkg)).digest("hex"); }

// Validate an evidence package against the spec. `bindings.now_epoch` enables expiry checks.
export function validateEvidencePackage(pkg, bindings = {}) {
  const r = []; const R = (c, m) => { if (c) r.push(m); };
  if (!pkg || typeof pkg !== "object") return { valid: false, refusals: ["package absent"] };
  for (const f of EVIDENCE_REQUIRED) R(pkg[f] === undefined || pkg[f] === null, "missing " + f);
  R(pkg.spec_version !== EVIDENCE_SPEC_VERSION, "wrong spec_version");
  R(pkg.classification && !EVIDENCE_CLASSIFICATIONS.includes(pkg.classification), "invalid classification");
  R(!Array.isArray(pkg.tests) || pkg.tests.length === 0, "no tests recorded");
  R(!Array.isArray(pkg.actions), "actions must be an array");
  // every claim must be backed by an evidence link — an unsupported claim fails.
  if (Array.isArray(pkg.claims)) for (const c of pkg.claims) R(!c.evidence || (Array.isArray(c.evidence) && c.evidence.length === 0), "unsupported claim (no evidence): " + (c.id || c.statement));
  // checker verdict must be an allowed value
  R(pkg.checker && !["CLEAN", "FINDINGS", "INSUFFICIENT_EVIDENCE"].includes(pkg.checker.result), "invalid checker result");
  // machine verifier must record a boolean pass
  R(pkg.machine_verifier && typeof pkg.machine_verifier.pass !== "boolean", "machine_verifier.pass must be boolean");
  // temporal
  R(typeof pkg.issued_epoch === "number" && typeof pkg.expiry_epoch === "number" && pkg.expiry_epoch <= pkg.issued_epoch, "expiry not after issue");
  R(typeof bindings.now_epoch === "number" && typeof pkg.expiry_epoch === "number" && bindings.now_epoch >= pkg.expiry_epoch, "evidence expired");
  return { valid: r.length === 0, refusals: r };
}

// Build a well-formed package skeleton from resolved run facts (helper; still must validate).
export function buildEvidencePackage(facts) {
  return {
    spec_version: EVIDENCE_SPEC_VERSION,
    candidate_sha: facts.candidate_sha, candidate_tree: facts.candidate_tree, source_identity: facts.source_identity,
    policy_version: facts.policy_version, provider_identity: facts.provider_identity, model_identifier: facts.model_identifier ?? "unknown",
    tool_versions: facts.tool_versions || {}, actions: facts.actions || [], refusals: facts.refusals || [],
    tests: facts.tests || [], machine_verifier: facts.machine_verifier || { pass: false }, checker: facts.checker || { result: "INSUFFICIENT_EVIDENCE" },
    findings: facts.findings || [], limitations: facts.limitations || [], gate_state: facts.gate_state || "HELD",
    signatures: facts.signatures || [], classification: facts.classification || "private",
    claims: facts.claims || [], issued_epoch: facts.issued_epoch, expiry_epoch: facts.expiry_epoch,
  };
}
