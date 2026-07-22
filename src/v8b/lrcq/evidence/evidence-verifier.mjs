// FounderGate LRCQ — Offline evidence verifier & trust roots (B14).
// Local, offline equivalent of `foundergate verify <evidence-package>`. Validates package
// structure, canonical digest, candidate SHA/tree, trusted builder/checker identity, approved
// policy, provider identity, required test classes, expiry, and deterministic-key signatures;
// detects tampering; refuses wrong-SHA / missing-test / stale evidence. NO production key, NO
// external certification.
import { validateEvidencePackage, packageDigest } from "./evidence-spec.mjs";
import { verifyFixtureSig } from "./evidence-anchor.mjs";

// trustRoots = { builders:[id...], checkers:[id...], policies:[ver...], providers:[identity...],
//                required_test_classes:[...], candidate_sha, candidate_tree, now_epoch, signing_key }
export function verifyEvidence(pkg, trustRoots = {}) {
  const refusals = []; const R = (c, m) => { if (c) refusals.push(m); };

  // 1. structural spec validity (also catches unsupported claims, expiry, classification)
  const sv = validateEvidencePackage(pkg, { now_epoch: trustRoots.now_epoch });
  if (!sv.valid) return { verified: false, refusals: sv.refusals.map((x) => "spec: " + x) };

  // 2. canonical digest — a supplied digest must match recomputation (tamper detection)
  if (pkg.__digest) { const body = { ...pkg }; delete body.__digest; R(packageDigest(body) !== pkg.__digest, "digest mismatch (tampered)"); }

  // 3. candidate binding
  if (trustRoots.candidate_sha !== undefined) R(pkg.candidate_sha !== trustRoots.candidate_sha, "wrong candidate_sha");
  if (trustRoots.candidate_tree !== undefined) R(pkg.candidate_tree !== trustRoots.candidate_tree, "wrong candidate_tree");

  // 4. trust roots — builder / checker / policy / provider must be approved
  const sigIds = (pkg.signatures || []).map((s) => s.identity);
  if (Array.isArray(trustRoots.builders)) R(!sigIds.some((id) => trustRoots.builders.includes(id)) && !(pkg.machine_verifier && trustRoots.builders.includes(pkg.machine_verifier.identity)), "no trusted builder identity");
  if (Array.isArray(trustRoots.checkers)) R(!(pkg.checker && trustRoots.checkers.includes(pkg.checker.identity)), "untrusted checker identity");
  if (Array.isArray(trustRoots.policies)) R(!trustRoots.policies.includes(pkg.policy_version), "unapproved policy_version");
  if (Array.isArray(trustRoots.providers)) R(!trustRoots.providers.includes(pkg.provider_identity), "unapproved provider_identity");

  // 5. required test classes present
  if (Array.isArray(trustRoots.required_test_classes)) {
    const have = new Set((pkg.tests || []).map((t) => t.class || t));
    for (const cls of trustRoots.required_test_classes) R(!have.has(cls), "missing required test class: " + cls);
  }

  // 6. signatures verify with the deterministic trust-root key (tamper on any signed digest fails)
  for (const s of pkg.signatures || []) {
    if (s.digest && s.signature) R(!verifyFixtureSig(s.digest, s.signature, trustRoots.signing_key), "bad signature by " + s.identity);
  }

  return { verified: refusals.length === 0, refusals };
}
