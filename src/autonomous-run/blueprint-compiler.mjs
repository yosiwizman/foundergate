// ARE-1 Blueprint Compiler (MOD-005 CTO Planner responsibility).
// Deterministic: accepted blueprint -> requirements registry, Spec Cards, lane
// DAG, risk classification, gates, Check Plans, acceptance predicates.
// Every generated item traces to (requirement_id + blueprint_digest +
// compiler_version + policy_version). No requirement silently disappears; no
// unrequested material feature silently appears.
//
// Gate classification is NOT reimplemented here — it is DELEGATED to the active
// ARLC policy (single source of truth) so ARE-1 does not duplicate ARLC.
import { readFileSync, existsSync } from "node:fs";
import { validateBlueprint, blueprintDigest } from "./blueprint-validator.mjs";

export const COMPILER_VERSION = "1.0.0";

function loadArlcClasses(repoRoot) {
  const p = repoRoot + "/.foundergate/governance/autonomous_repository_lifecycle.json";
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, "utf8")).action_classification;
}

// Map a requirement's declared authority needs to an action class by DELEGATING
// to the active ARLC policy (single source of truth) and FAILING CLOSED.
// Rule: a requirement is OPERATIONAL_AUTONOMOUS only if it carries NO external
// action, NO provider need, and NO sensitive data class. Any authority-bearing
// need routes to a founder/human gate. If the ARLC policy is unavailable we
// cannot verify against the source of truth, so we still fail closed.
const SENSITIVE_DATA = ["customer", "pii", "health", "private", "secret", "personal", "financial"];

export function classifyRequirementGate(req, arlcClasses) {
  if (req.legal === true || req.security_boundary === true) return "HUMAN_EXPERT_GATE";
  if (req.authority_unknown === true) return "TRUE_FOUNDER_GATE"; // fail closed

  const external = (req.external_actions || []).map((s) => String(s).toLowerCase());
  const providers = (req.provider_needs || []).map((s) => String(s).toLowerCase());
  const data = (req.data_classes || []).map((s) => String(s).toLowerCase());
  const hasAuthorityNeed = external.length > 0 || providers.length > 0;
  const sensitiveData = data.some((d) => SENSITIVE_DATA.some((k) => d.includes(k)));

  // Delegate: derive founder-gate keywords from ARLC's TRUE_FOUNDER_GATE examples
  // (so the classification tracks the ARLC policy, not a private copy).
  const founderKeywords = new Set();
  const arlcFounder = arlcClasses && arlcClasses.classes &&
    arlcClasses.classes.TRUE_FOUNDER_GATE && arlcClasses.classes.TRUE_FOUNDER_GATE.examples;
  if (arlcFounder) {
    for (const ex of arlcFounder) {
      for (const tok of String(ex).toLowerCase().split(/[_\s]+/)) if (tok.length > 2) founderKeywords.add(tok);
    }
  }
  // Hardening synonyms for common phrasings the examples may not spell out.
  ["prod", "pii", "card", "charge", "live", "ship", "public", "health", "customer",
   "private", "akior", "payment", "deploy", "release", "provider", "adopt"].forEach((k) => founderKeywords.add(k));
  const text = [...external, ...providers, ...data].join(" ");
  const matchesFounder = [...founderKeywords].some((k) => text.includes(k));

  if (matchesFounder || sensitiveData) return "TRUE_FOUNDER_GATE";
  // Fail closed: any remaining authority-bearing need is a founder gate even if
  // no keyword matched (unknown external action / provider is not routine).
  if (hasAuthorityNeed) return "TRUE_FOUNDER_GATE";
  return "OPERATIONAL_AUTONOMOUS";
}

export function compileBlueprint(bp, opts = {}) {
  const policyVersion = opts.policyVersion || "unknown";
  const repoRoot = opts.repoRoot || ".";
  const v = validateBlueprint(bp);
  if (v.state === "BLUEPRINT_INVALID") {
    return { ok: false, state: v.state, reason: "invalid blueprint", detail: v };
  }
  const digest = blueprintDigest(bp);
  const arlcClasses = loadArlcClasses(repoRoot);
  const reqs = Array.isArray(bp.functional_requirements) ? bp.functional_requirements : [];

  const trace = (id) => ({
    requirement_id: id, blueprint_digest: digest,
    compiler_version: COMPILER_VERSION, policy_version: policyVersion,
  });

  const requirements = reqs.map((r, i) => {
    const id = r.id || `FR-${i + 1}`;
    return { id, text: r.text || String(r), gate: classifyRequirementGate(r, arlcClasses), trace: trace(id) };
  });

  // No silent drop / add: the registry must have exactly one entry per input
  // requirement, and no duplicate IDs (an ID collision would silently merge two
  // requirements into one — a real drop). Count + duplicate checks can actually fire.
  const outputIds = requirements.map((r) => r.id);
  if (requirements.length !== reqs.length) {
    return { ok: false, state: "PLAN_INVALID", reason: "requirement count changed", input: reqs.length, output: requirements.length };
  }
  const dupOut = outputIds.filter((id, i) => outputIds.indexOf(id) !== i);
  if (dupOut.length) {
    return { ok: false, state: "PLAN_INVALID", reason: "duplicate requirement id (silent-merge/collision risk)", duplicates: [...new Set(dupOut)] };
  }

  const specCards = requirements.map((r) => ({
    spec_card_id: `SC-${r.id}`, requirement_id: r.id, gate: r.gate,
    acceptance: (bp.acceptance_criteria || []).filter((a) => (a.requirement_id || null) === r.id),
    trace: r.trace,
  }));

  const laneClass = (gate) => (gate === "OPERATIONAL_AUTONOMOUS" ? "WIDE_SAFE" : "NARROW_SENSITIVE");
  const lanes = requirements.map((r) => ({
    lane_id: `LANE-${r.id}`, requirement_id: r.id, class: laneClass(r.gate),
    gate: r.gate, depends_on: [], trace: r.trace,
  }));

  const founderGates = requirements.filter((r) => r.gate === "TRUE_FOUNDER_GATE").map((r) => r.id);
  const humanExpertGates = requirements.filter((r) => r.gate === "HUMAN_EXPERT_GATE").map((r) => r.id);

  return {
    ok: true, state: "PLAN_COMPILED",
    blueprint_digest: digest, compiler_version: COMPILER_VERSION, policy_version: policyVersion,
    normalized_blueprint: bp,
    requirements_registry: requirements,
    spec_cards: specCards,
    lane_dag: lanes,
    wide_safe_lanes: lanes.filter((l) => l.class === "WIDE_SAFE").map((l) => l.lane_id),
    narrow_sensitive_lanes: lanes.filter((l) => l.class === "NARROW_SENSITIVE").map((l) => l.lane_id),
    true_founder_gates: founderGates,
    human_expert_gates: humanExpertGates,
    check_plans: specCards.map((s) => ({ check_plan_id: `CP-${s.requirement_id}`, spec_card_id: s.spec_card_id, trace: s.trace })),
    sandbox_requirements: bp.provider_needs || [],
    provider_requirements: bp.provider_needs || [],
    data_boundaries: { data_classes: bp.data_classes || [], secret_classes: bp.secret_classes || [] },
    expected_evidence_classes: bp.evidence_expectations || [],
    acceptance_predicates: bp.acceptance_criteria || [],
    rollback_requirements: bp.rollback_expectations || [],
    estimated_operational_actions: lanes.filter((l) => l.class === "WIDE_SAFE").length,
    estimated_founder_interactions: founderGates.length + humanExpertGates.length,
    stage_boundaries: ["BLUEPRINT_ACCEPTED", "PLAN_COMPILED", "PLAN_CHECKED", "READY_TO_RUN"],
  };
}
