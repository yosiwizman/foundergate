// FounderGate LRCQ — FounderGate assurance case (A05).
// A machine-readable + founder-readable claim→evidence graph for an EXACT candidate. Every claim
// must cite backing evidence; an unsupported claim FAILS validation. Required identity/verification
// nodes must all be present. Produces JSON plus a compact founder view.
export const ASSURANCE_CASE_VERSION = "foundergate-assurance-case-1";

export const REQUIRED_NODES = [
  "candidate_identity", "source_identity", "policy_identity", "provider_identity", "environment_identity",
  "authorized_capability", "required_tests", "refusal_proofs", "machine_verifier", "independent_checker",
  "unresolved_limitations", "recovery_state", "gate_state", "evidence_links",
];

export function buildAssuranceCase(facts) {
  return {
    version: ASSURANCE_CASE_VERSION,
    nodes: {
      candidate_identity: { sha: facts.candidate_sha, tree: facts.candidate_tree },
      source_identity: facts.source_identity, policy_identity: facts.policy_version,
      provider_identity: facts.provider_identity, environment_identity: facts.environment_identity,
      authorized_capability: facts.authorized_capability || [], required_tests: facts.required_tests || [],
      refusal_proofs: facts.refusal_proofs || [], machine_verifier: facts.machine_verifier || { pass: false },
      independent_checker: facts.independent_checker || { result: "INSUFFICIENT_EVIDENCE" },
      unresolved_limitations: facts.unresolved_limitations || [], recovery_state: facts.recovery_state || "unknown",
      gate_state: facts.gate_state || "HELD", evidence_links: facts.evidence_links || [],
    },
    claims: facts.claims || [],
  };
}

// Validate: all required nodes present + non-null; every claim cites >=1 evidence link that exists
// in evidence_links; no claim asserts completion the checker/verifier did not support.
export function validateAssuranceCase(ac) {
  const r = []; const R = (c, m) => { if (c) r.push(m); };
  if (!ac || !ac.nodes) return { valid: false, refusals: ["assurance case absent"] };
  for (const nd of REQUIRED_NODES) R(ac.nodes[nd] === undefined || ac.nodes[nd] === null, "missing node " + nd);
  const links = new Set((ac.nodes.evidence_links || []).map((l) => l.id || l));
  for (const c of ac.claims || []) {
    R(!Array.isArray(c.evidence) || c.evidence.length === 0, "unsupported claim (no evidence): " + (c.id || c.statement));
    for (const e of c.evidence || []) R(!links.has(e), "claim '" + (c.id || c.statement) + "' cites unknown evidence link: " + e);
    // a claim asserting COMPLETION requires checker CLEAN + machine verifier pass
    if (c.asserts === "completed") { R(ac.nodes.independent_checker.result !== "CLEAN", "claim asserts completion but checker not CLEAN"); R(ac.nodes.machine_verifier.pass !== true, "claim asserts completion but machine verifier did not pass"); }
  }
  return { valid: r.length === 0, refusals: r };
}

// Compact founder-readable view.
export function founderView(ac) {
  return {
    candidate: ac.nodes.candidate_identity, gate_state: ac.nodes.gate_state, recovery_state: ac.nodes.recovery_state,
    checker: ac.nodes.independent_checker.result, machine_verified: ac.nodes.machine_verifier.pass,
    claims: (ac.claims || []).map((c) => ({ statement: c.statement, supported_by: (c.evidence || []).length + " evidence link(s)", asserts: c.asserts || "supporting" })),
    unresolved_limitations: ac.nodes.unresolved_limitations,
  };
}
